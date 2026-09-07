import { randomBytes } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.schema';
import { OAuthExchangeFailedException } from '../common/exceptions/app.exception';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { CurrentUser } from './current-user.decorator';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UserResponseDto, toUserResponseDto } from './dto/user-response.dto';
import { OAuthProviderRegistry } from './oauth/oauth-provider-registry';
import { PasswordResetService } from './password-reset/password-reset.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateNicknameDto } from './dto/update-nickname.dto';
import { UpdateProfileVisibilityDto } from './dto/update-profile-visibility.dto';
import { clearSessionCookie, setSessionCookie } from './session-cookie';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { UsersService } from '../users/users.service';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
// Set alongside oauth_state only when a valid session already exists at
// /auth/:provider — signals "link this to my current account" rather than
// "log me in." Same short TTL as the state cookie since it only needs to
// survive one redirect round trip.
const OAUTH_LINK_INTENT_COOKIE = 'oauth_link_intent';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
    private readonly oauthProviders: OAuthProviderRegistry,
    private readonly passwordResetService: PasswordResetService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Requests a signup — creates nothing yet, just emails a link. See
  // AuthService.requestSignup for why (nobody can claim/squat an email
  // this way). Tighter than the app-wide default — signup/login are the
  // classic brute-force/spam targets, so this budget is IP-per-route, not
  // shared with the rest of the app's 100/60s.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('signup')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signup(@Body() dto: SignupDto): Promise<void> {
    await this.authService.requestSignup(dto);
  }

  // Consumes the link signup sent — this is what actually creates the
  // account (already verified) and logs it straight in.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('complete-signup')
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({ status: HttpStatus.CREATED, type: UserResponseDto })
  async completeSignup(
    @Body() dto: CompleteSignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, session } = await this.authService.completeSignup(
      dto.token,
      dto.password,
      req.headers['user-agent'],
    );
    setSessionCookie(res, this.config, session.token, session.expiresAt);
    const nicknameChangeAvailableAt =
      await this.usersService.nicknameChangeAvailableAt(user);
    const linkedProviders = await this.authService.getLinkedProviders(user.id);
    return toUserResponseDto(user, nicknameChangeAvailableAt, linkedProviders);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: UserResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, session } = await this.authService.login(
      dto,
      req.headers['user-agent'],
    );
    setSessionCookie(res, this.config, session.token, session.expiresAt);
    const nicknameChangeAvailableAt =
      await this.usersService.nicknameChangeAvailableAt(user);
    const linkedProviders = await this.authService.getLinkedProviders(user.id);
    return toUserResponseDto(user, nicknameChangeAvailableAt, linkedProviders);
  }

  // Public — the token itself (not a session) is the proof of authorization,
  // same as any password-reset-link flow. Only ever issued from /admin
  // (AdminController.issuePasswordResetLink) for now, not self-service.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordResetService.resetPassword(dto.token, dto.password);
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = req.cookies?.[
      this.config.get('SESSION_COOKIE_NAME', { infer: true })
    ] as string | undefined;
    if (token) await this.sessionService.revokeToken(token);
    clearSessionCookie(res, this.config);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ZodResponse({ type: UserResponseDto })
  async me(@CurrentUser() userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new InternalServerErrorException(
        'Session references a missing user.',
      );
    }
    const nicknameChangeAvailableAt =
      await this.usersService.nicknameChangeAvailableAt(user);
    const linkedProviders = await this.authService.getLinkedProviders(user.id);
    return toUserResponseDto(user, nicknameChangeAvailableAt, linkedProviders);
  }

  // No reveal/anonymity behavior yet — this only lets a signed-in user set
  // what nickname *would* be shown on a future opt-in "post as me" round.
  // Not unique — see users.schema.ts.
  @Post('nickname')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: UserResponseDto })
  async updateNickname(
    @CurrentUser() userId: string,
    @Body() dto: UpdateNicknameDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateNickname(userId, dto.nickname);
    const nicknameChangeAvailableAt =
      await this.usersService.nicknameChangeAvailableAt(user);
    const linkedProviders = await this.authService.getLinkedProviders(user.id);
    return toUserResponseDto(user, nicknameChangeAvailableAt, linkedProviders);
  }

  // Independent per-field switches — three for the public profile
  // (/u/[slug]) itself, plus nicknameVisible (whether the nickname shows up
  // anywhere at all, including past posts) — see users.schema.ts and
  // ProfileService.findProfile.
  @Patch('profile-visibility')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: UserResponseDto })
  async updateProfileVisibility(
    @CurrentUser() userId: string,
    @Body() dto: UpdateProfileVisibilityDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateProfileVisibility(userId, dto);
    const nicknameChangeAvailableAt =
      await this.usersService.nicknameChangeAvailableAt(user);
    const linkedProviders = await this.authService.getLinkedProviders(user.id);
    return toUserResponseDto(user, nicknameChangeAvailableAt, linkedProviders);
  }

  // One pair of routes for every provider (google/kakao/naver) instead of
  // one pair each — see docs/decisions/2026-08-26-onseol-kakao-naver-oauth-
  // decisions.md. Declared after the static routes above (me, etc.) so
  // Express's route-registration-order matching can't let :provider shadow
  // them.
  @Get(':provider')
  async oauthRedirect(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.oauthProviders.isKnown(provider)) throw new NotFoundException();
    const oauthProvider = this.oauthProviders.get(provider);

    const state = randomBytes(16).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: OAUTH_STATE_TTL_MS,
      sameSite: 'lax',
    });

    // A valid session already at this point means this is "connect this
    // provider to my account" (e.g. from /me), not "log me in" — the
    // callback below re-checks the live session again rather than trusting
    // this cookie alone, so it's only a hint carried across the redirect.
    const sessionToken = req.cookies?.[
      this.config.get('SESSION_COOKIE_NAME', { infer: true })
    ] as string | undefined;
    const session = sessionToken
      ? await this.sessionService.validateToken(sessionToken)
      : null;
    if (session) {
      res.cookie(OAUTH_LINK_INTENT_COOKIE, '1', {
        httpOnly: true,
        maxAge: OAUTH_STATE_TTL_MS,
        sameSite: 'lax',
      });
    } else {
      res.clearCookie(OAUTH_LINK_INTENT_COOKIE);
    }

    res.redirect(oauthProvider.getAuthorizeUrl(state));
  }

  @Get(':provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.oauthProviders.isKnown(provider)) throw new NotFoundException();
    const oauthProvider = this.oauthProviders.get(provider);

    const code = req.query.code;
    const state = req.query.state;
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    const linkIntent = req.cookies?.[OAUTH_LINK_INTENT_COOKIE] as
      string | undefined;
    res.clearCookie(OAUTH_STATE_COOKIE);
    res.clearCookie(OAUTH_LINK_INTENT_COOKIE);

    if (
      typeof code !== 'string' ||
      typeof state !== 'string' ||
      state !== cookieState
    ) {
      throw new OAuthExchangeFailedException(provider);
    }

    const profile = await oauthProvider.exchangeCode(code, state);
    const webUrl = this.config.get('WEB_PUBLIC_URL', { infer: true });

    if (linkIntent) {
      // Re-validate the session *now*, at the callback — the account to
      // link to must come from a live session token, never from anything
      // that round-tripped through the OAuth redirect (state/cookies an
      // attacker could otherwise try to forge to link onto someone else's
      // account). If the session lapsed in the meantime, fall through to
      // a normal login attempt below instead of erroring.
      const sessionToken = req.cookies?.[
        this.config.get('SESSION_COOKIE_NAME', { infer: true })
      ] as string | undefined;
      const session = sessionToken
        ? await this.sessionService.validateToken(sessionToken)
        : null;
      if (session) {
        await this.authService.linkOAuth(session.userId, provider, profile);
        res.redirect(`${webUrl}/me?linked=${provider}`);
        return;
      }
    }

    const { session, linkedExistingAccount } =
      await this.authService.loginWithOAuth(
        provider,
        profile,
        req.headers['user-agent'],
      );
    setSessionCookie(res, this.config, session.token, session.expiresAt);
    // A merge into an existing verified account is a "surprise" worth
    // explaining (see the AuthService.loginWithOAuth comment above) — land
    // on /me, which already shows the account this session is now on,
    // rather than /today where nothing calls it out. A routine login/
    // fresh signup has nothing to explain, so it keeps the normal target.
    res.redirect(
      linkedExistingAccount ? `${webUrl}/me?merged=1` : `${webUrl}/today`,
    );
  }
}
