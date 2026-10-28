export const APP_NAME = 'Living Stage';

export {
  DANCE_TITLE_MAX_LENGTH,
  parseDanceInput,
  parseDanceTitle,
  type Dance,
  type DanceInput,
  type DanceResponse,
  type ListDancesResponse,
} from './dance.ts';
export {
  DANCER_COLOR_COUNT,
  DANCER_NAME_MAX_LENGTH,
  isDancerColor,
  parseDancerInput,
  parseDancerName,
  type Dancer,
  type DancerColor,
  type DancerInput,
  type DancerResponse,
  type ListDancersResponse,
} from './dancer.ts';
export type { HealthResponse } from './health.ts';
export {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_VALID_DAYS,
  formatInviteCode,
  parseInviteCode,
  type CreateInviteResponse,
  type Invite,
  type InvitePreviewResponse,
  type JoinSchoolResponse,
  type SchoolInviteResponse,
} from './invite.ts';
export type { MeResponse } from './me.ts';
export {
  SCHOOL_NAME_MAX_LENGTH,
  parseSchoolName,
  type CreateSchoolRequest,
  type CreateSchoolResponse,
  type ListSchoolsResponse,
  type School,
} from './school.ts';
export {
  SIDE_WING_DEPTH,
  STAGE_CENTER,
  STAGE_DEPTH_M,
  STAGE_QUARTERS,
  STAGE_WIDTH_M,
  UPSTAGE_WING_DEPTH,
} from './stage.ts';
