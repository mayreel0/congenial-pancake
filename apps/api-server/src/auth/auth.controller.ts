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
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.schema';
import { OAuthExchangeFailedException } from '../common/exceptions/app.exception';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import {
  toUserResponseDto,
  type UserResponseDto,
} from './dto/user-response.dto';
import { OAuthProviderRegistry } from './oauth/oauth-provider-registry';
import { clearSessionCookie, setSessionCookie } from './session-cookie';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { UsersService } from '../users/users.service';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
    private readonly oauthProviders: OAuthProviderRegistry,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Tighter than the app-wide default — signup/login are the classic
  // brute-force/spam targets, so this budget is IP-per-route, not shared
  // with the rest of the app's 100/60s.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() dto: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, session } = await this.authService.signup(
      dto,
      req.headers['user-agent'],
    );
    setSessionCookie(res, this.config, session.token, session.expiresAt);
    return toUserResponseDto(user);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
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
    return toUserResponseDto(user);
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
  async me(@CurrentUser() userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new InternalServerErrorException(
        'Session references a missing user.',
      );
    }
    return toUserResponseDto(user);
  }

  // One pair of routes for every provider (google/kakao/naver) instead of
  // one pair each — see docs/decisions/2026-08-26-onseol-kakao-naver-oauth-
  // decisions.md. Declared after the static routes above (me, etc.) so
  // Express's route-registration-order matching can't let :provider shadow
  // them.
  @Get(':provider')
  oauthRedirect(
    @Param('provider') provider: string,
    @Res() res: Response,
  ): void {
    if (!this.oauthProviders.isKnown(provider)) throw new NotFoundException();
    const oauthProvider = this.oauthProviders.get(provider);

    const state = randomBytes(16).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: OAUTH_STATE_TTL_MS,
      sameSite: 'lax',
    });
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
    res.clearCookie(OAUTH_STATE_COOKIE);

    if (
      typeof code !== 'string' ||
      typeof state !== 'string' ||
      state !== cookieState
    ) {
      throw new OAuthExchangeFailedException(provider);
    }

    const profile = await oauthProvider.exchangeCode(code, state);
    const { session } = await this.authService.loginWithOAuth(
      provider,
      profile,
      req.headers['user-agent'],
    );
    setSessionCookie(res, this.config, session.token, session.expiresAt);
    res.redirect(`${this.config.get('WEB_PUBLIC_URL', { infer: true })}/today`);
  }
}
