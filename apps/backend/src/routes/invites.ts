import {
  INVITE_VALID_DAYS,
  parseInviteCode,
  type CreateInviteResponse,
  type Invite,
  type InvitePreviewResponse,
  type JoinSchoolResponse,
  type SchoolInviteResponse,
} from '@living-stage/shared';
import { Router } from 'express';
import { requireSession } from '../auth/require-session.ts';
import { prisma } from '../db.ts';
import { generateInviteCode } from '../invites/generate-invite-code.ts';
import { toSchool } from './schools.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export const schoolInviteRouter = Router();

schoolInviteRouter.get('/invite', async (_req, res) => {
  const invite = await prisma.invite.findFirst({
    where: { schoolId: res.locals.schoolId, expiresAt: { gt: new Date() } },
  });

  res.json({ invite: invite && toInvite(invite) } satisfies SchoolInviteResponse);
});

schoolInviteRouter.post('/invite', async (_req, res) => {
  const schoolId = res.locals.schoolId;
  const fields = {
    code: generateInviteCode(),
    expiresAt: new Date(Date.now() + INVITE_VALID_DAYS * DAY_MS),
    createdById: res.locals.auth.user.id,
  };
  const invite = await prisma.invite.upsert({
    where: { schoolId },
    create: { schoolId, ...fields },
    update: fields,
  });

  res.status(201).json({ invite: toInvite(invite) } satisfies CreateInviteResponse);
});

export const invitesRouter = Router();

invitesRouter.get('/invites/:code', requireSession, async (req, res) => {
  const invite = await findActiveInvite(req.params.code);
  if (!invite) {
    res.status(404).json({ error: 'invite_not_found' });
    return;
  }

  res.json({ school: { name: invite.school.name } } satisfies InvitePreviewResponse);
});

invitesRouter.post('/invites/:code/accept', requireSession, async (req, res) => {
  const invite = await findActiveInvite(req.params.code);
  if (!invite) {
    res.status(404).json({ error: 'invite_not_found' });
    return;
  }

  const school = await prisma.school.update({
    where: { id: invite.schoolId },
    data: { teachers: { connect: { id: res.locals.auth.user.id } } },
  });

  res.json({ school: toSchool(school) } satisfies JoinSchoolResponse);
});

function findActiveInvite(rawCode: unknown) {
  const code = parseInviteCode(rawCode);
  if (!code) return null;
  return prisma.invite.findFirst({
    where: { code, expiresAt: { gt: new Date() } },
    include: { school: { select: { name: true } } },
  });
}

function toInvite({ code, expiresAt }: { code: string; expiresAt: Date }): Invite {
  return { code, expiresAt: expiresAt.toISOString() };
}
