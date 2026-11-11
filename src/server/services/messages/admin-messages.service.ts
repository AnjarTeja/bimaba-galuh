import type { z } from "zod";
import { MessageQuerySchema } from "@/contracts/messages";
import type { AuthenticatedSession } from "@/server/auth/session";
import { getBranchFilter } from "@/server/auth/branch-scope";
import { AppError } from "@/server/http/errors";
import {
  findMessage,
  listMessages as listMessageRecords,
  updateMessageStatus,
} from "@/server/repositories/messages/admin-messages.repository";

type MessageQuery = z.infer<typeof MessageQuerySchema>;

export async function listMessages(
  query: MessageQuery,
  page: { skip: number; take: number },
  session: AuthenticatedSession,
) {
  const where = {
    ...getBranchFilter(session, query.branch_id),
    ...(query.status ? { status: query.status } : {}),
  };
  const [messages, total] = await listMessageRecords(where, page.skip, page.take);
  return { messages, total };
}

export async function updateMessage(
  input: {
    id: string;
    status: "new" | "in_progress" | "resolved" | "archived";
  },
  session: AuthenticatedSession,
) {
  const message = await findMessage(input.id, getBranchFilter(session) ?? {});
  if (!message) {
    throw new AppError("NOT_FOUND", "Pesan tidak ditemukan.", 404);
  }
  const updated = await updateMessageStatus(
    message.id,
    message.branchId,
    message.status,
    input.status,
    session.userId,
    new Date(),
  );
  return {
    id: message.id,
    status: updated.status,
    handled_at: updated.handledAt?.toISOString() ?? null,
  };
}
