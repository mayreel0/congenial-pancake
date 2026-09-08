import { createHash, randomBytes } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import {
  EmailAlreadyExistsException,
  EmailNotVerifiedException,
  EmailSendFailedException,
  EmailVerificationTokenInvalidException,
  InvalidCredentialsException,
  OAuthAccountAlreadyLinkedException,
} from '../common/exceptions/app.exception';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import type { User } from '../users/users.repository';
import type { LoginDto } from './dto/login.dto';
import type { SignupDto } from './dto/signup.dto';
import { OAuthIdentitiesRepository } from './oauth-identities.repository';
import type { OAuthProviderName } from './oauth/oauth-provider-registry';
import type { OAuthProfile } from './oauth/oauth-provider.interface';
import { PasswordHasherService } from './password/password-hasher.service';
import { PendingSignupsRepository } from './pending-signups.repository';
import { SessionService } from './session.service';
import type { Session } from './sessions.repository';

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h — long enough to check an inbox at one's own pace.
const RESEND_COOLDOWN_MS = 60 * 1000; // 60s between signup emails to the same address — common resend UX convention.

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type AuthResult = { user: User; session: Session };
// linkedExistingAccount: true only when this login resolved to an
// already-verified pre-existing account by email match (a safe, expected
// merge — e.g. a second OAuth provider sharing the same real email as one
// already used here). false for a brand-new account, a routine repeat
// login, and an unverified-account takeover — none of those are a
// surprising merge the frontend needs to explain.
type OAuthLoginResult = AuthResult & { linkedExistingAccount: boolean };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly oauthIdentitiesRepository: OAuthIdentitiesRepository,
    private readonly pendingSignupsRepository: PendingSignupsRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Nothing is created yet — a users row only exists once someone proves
  // they own the email by consuming the link this sends (completeSignup
  // below). This is what makes it impossible to squat/block someone
  // else's email: submitting it here never reserves anything, it only
  // ever results in an email landing in an inbox someone else controls.
  async requestSignup(dto: SignupDto): Promise<void> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new EmailAlreadyExistsException();

    // Silently no-op within the cooldown rather than erroring — same
    // "don't reveal state through the response" posture as the
    // already-verified case, and it means a double-click or an impatient
    // retry never looks different from a normal first request.
    const mostRecent =
      await this.pendingSignupsRepository.findMostRecentByEmail(dto.email);
    if (
      mostRecent &&
      Date.now() - mostRecent.createdAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return;
    }

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await this.pendingSignupsRepository.create(
      dto.email,
      hashToken(token),
      expiresAt,
    );

    const webUrl = this.config.get('WEB_PUBLIC_URL', { infer: true });
    const verifyUrl = `${webUrl}/verify-email?token=${token}`;

    // Unlike the old signup flow, this is never swallowed — the email is
    // the only delivery mechanism at this point (nothing exists yet for
    // the caller to fall back on), so a silent failure would leave them
    // with no way to know they need to retry.
    try {
      await this.emailService.send({
        to: dto.email,
        subject: '온설 이메일을 인증해주세요',
        html: `<p>아래 링크를 눌러 이메일 인증을 완료하고 가입을 마쳐주세요.</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>이 링크는 24시간 동안만 유효합니다.</p>`,
      });
    } catch {
      throw new EmailSendFailedException();
    }
  }

  // The token is the only proof of authorization here (same shape as
  // password-reset) — consuming it is what actually creates the account,
  // already verified, and logs it straight in.
  async completeSignup(
    token: string,
    password: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const record = await this.pendingSignupsRepository.findValidByHash(
      hashToken(token),
    );
    if (!record) throw new EmailVerificationTokenInvalidException();

    // Someone else may have already claimed this exact email in the
    // meantime (another pending request for the same address completed
    // first, or an OAuth signup landed on it) — the token proved this
    // person owns the inbox, not that the email is still free.
    const existing = await this.usersService.findByEmail(record.email);
    if (existing) throw new EmailAlreadyExistsException();

    const passwordHash = await this.passwordHasher.hash(password);
    const user = await this.usersService.create({
      email: record.email,
      passwordHash,
      emailVerifiedAt: new Date(),
    });
    await this.pendingSignupsRepository.markUsed(record.id);

    const session = await this.sessionService.createSession(user.id, userAgent);
    return { user, session };
  }

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.passwordHash) throw new InvalidCredentialsException();

    const valid = await this.passwordHasher.compare(
      dto.password,
      user.passwordHash,
    );
    if (!valid) throw new InvalidCredentialsException();

    // Defensive only, not a primary gate — going forward, a password
    // account only ever gets created inside completeSignup, which sets
    // emailVerifiedAt in the same step, so this can't happen for any new
    // account. Kept as a safety net against legacy rows from before that
    // invariant existed. Checked *after* the password match so a wrong
    // password never leaks "this account exists but isn't verified."
    if (!user.emailVerifiedAt) throw new EmailNotVerifiedException();

    const session = await this.sessionService.createSession(user.id, userAgent);
    return { user, session };
  }

  async loginWithOAuth(
    provider: OAuthProviderName,
    profile: OAuthProfile,
    userAgent?: string,
  ): Promise<OAuthLoginResult> {
    const existingIdentity =
      await this.oauthIdentitiesRepository.findByProviderAccount(
        provider,
        profile.providerAccountId,
      );

    let user: User;
    let linkedExistingAccount = false;
    if (existingIdentity) {
      const found = await this.usersService.findById(existingIdentity.userId);
      if (!found) {
        throw new InternalServerErrorException(
          'OAuth identity references a missing user.',
        );
      }
      user = found;
    } else {
      // Link by email if this person already has a password account, or
      // an account via a *different* OAuth provider that used the same
      // email — either way, one 온설 account per email, but only treated
      // as a safe merge when that existing account is already verified.
      //
      // An *unverified* password account under this email isn't proof of
      // anything — every password account is created already-verified
      // now (see completeSignup), so an unverified row here can only be
      // legacy data from before that invariant existed. It's provably
      // inert (nothing could ever attach to it — nickname, requests,
      // replies all require a session, and this account could never log
      // in to get one), so this OAuth login can safely take it over in
      // place: attach the identity, verify it, and clear whatever
      // password is on file (never proven to belong to whoever just
      // showed up with real OAuth proof).
      const existingByEmail = await this.usersService.findByEmail(
        profile.email,
      );

      if (existingByEmail && !existingByEmail.emailVerifiedAt) {
        await this.usersService.clearPasswordHash(existingByEmail.id);
        user = existingByEmail;
      } else if (existingByEmail) {
        user = existingByEmail;
        linkedExistingAccount = true;
      } else {
        user = await this.usersService.create({
          email: profile.email,
          emailVerifiedAt: new Date(),
        });
      }

      await this.oauthIdentitiesRepository.create(
        user.id,
        provider,
        profile.providerAccountId,
      );
    }

    // The provider vouches for this email regardless of whether the
    // account is brand-new, an already-verified account being linked, or
    // a legacy-unverified row just taken over above — either way, this
    // login is real proof of ownership, so the account ends up verified.
    if (!user.emailVerifiedAt) {
      await this.usersService.markEmailVerified(user.id);
      user = { ...user, emailVerifiedAt: new Date() };
    }

    const session = await this.sessionService.createSession(user.id, userAgent);
    return { user, session, linkedExistingAccount };
  }

  // Attaches a social account to the *caller's own currently-authenticated
  // account* — deliberately never touches email matching (that's only
  // ever a cold, not-logged-in concern, see loginWithOAuth above). The
  // caller having a live session is itself the proof of ownership this
  // needs: the userId must come from re-validating that session at the
  // OAuth callback, never from anything round-tripped through the OAuth
  // redirect, or this could be spoofed into linking onto someone else's
  // account.
  async linkOAuth(
    userId: string,
    provider: OAuthProviderName,
    profile: OAuthProfile,
  ): Promise<User> {
    const existingIdentity =
      await this.oauthIdentitiesRepository.findByProviderAccount(
        provider,
        profile.providerAccountId,
      );
    if (existingIdentity && existingIdentity.userId !== userId) {
      throw new OAuthAccountAlreadyLinkedException(provider);
    }

    let user = await this.usersService.findById(userId);
    if (!user) {
      throw new InternalServerErrorException(
        'Session references a missing user.',
      );
    }

    // Already linked to this same account — idempotent no-op rather than
    // a duplicate row (findByProviderAccount above already confirmed it's
    // not someone else's).
    if (!existingIdentity) {
      await this.oauthIdentitiesRepository.create(
        userId,
        provider,
        profile.providerAccountId,
      );
    }

    // Only counts as proof of *this account's* email if the provider's
    // email is the exact one on file — linking a social account with a
    // different email is a real, useful login method, but it proves
    // nothing about the account's own email. In practice this can no
    // longer fire (having a live session already implies the account is
    // verified, see login/completeSignup/loginWithOAuth), but it's kept
    // as a safety net rather than relying on that invariant holding
    // forever.
    if (!user.emailVerifiedAt && profile.email === user.email) {
      await this.usersService.markEmailVerified(userId);
      user = { ...user, emailVerifiedAt: new Date() };
    }

    return user;
  }

  getLinkedProviders(userId: string): Promise<OAuthProviderName[]> {
    return this.oauthIdentitiesRepository
      .findByUserId(userId)
      .then((identities) => identities.map((identity) => identity.provider));
  }

  // Always logs the account out everywhere immediately, regardless of
  // which path below runs — a withdrawal request (even a reversible one)
  // shouldn't leave existing sessions usable in the meantime.
  //
  // immediate skips the 30-day grace period entirely and scrubs right
  // away — deliberately not reversible (email/oauth_identities are gone
  // the moment this returns, same end state the daily cron would reach on
  // its own after 30 days). The default path only stamps
  // deletionRequestedAt; nothing else about the row changes until either
  // restoreAccount clears it or AccountDeletionCronService finalizes it.
  async requestWithdrawal(userId: string, immediate: boolean): Promise<void> {
    await this.sessionService.revokeAllForUser(userId);
    if (immediate) {
      await this.finalizeAccountDeletion(userId);
    } else {
      await this.usersService.requestDeletion(userId);
    }
  }

  // The actual scrub — shared by the immediate-withdrawal path above and
  // AccountDeletionCronService, which calls this once a non-immediate
  // withdrawal's 30-day grace period has elapsed. Clearing
  // oauth_identities lives here (not in UsersService.scrubForDeletion)
  // since it needs this service's own OAuthIdentitiesRepository — frees
  // up (provider, providerAccountId) so the same social account can sign
  // up fresh under a new account later.
  async finalizeAccountDeletion(userId: string): Promise<void> {
    await this.usersService.scrubForDeletion(userId);
    await this.oauthIdentitiesRepository.deleteAllForUser(userId);
  }

  // Idempotent no-op if the account isn't actually pending deletion —
  // the frontend only ever calls this from the restore dialog, which only
  // renders when GET /auth/me reported a deletionGracePeriodEndsAt, but
  // nothing here depends on that being true.
  restoreAccount(userId: string): Promise<void> {
    return this.usersService.restoreAccount(userId);
  }
}
