export const APP_NAME = 'Living Stage';

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
