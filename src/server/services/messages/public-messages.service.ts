import type { CreateMessageSchema } from "@/contracts/messages";
import {
  createPublicMessage,
  findAvailableBranch,
} from "@/server/repositories/messages/public-messages.repository";
import { AppError } from "@/server/http/errors";
import type { z } from "zod";

type CreateMessageInput = z.infer<typeof CreateMessageSchema>;

export async function createPublicMessageFromInput(input: CreateMessageInput) {
  if (input.branch_id && !(await findAvailableBranch(input.branch_id))) {
    throw new AppError("VALIDATION_ERROR", "Cabang tidak tersedia.", 400);
  }

  const message = await createPublicMessage({
    name: input.name,
    contact: input.contact,
    category: input.category,
    branchId: input.branch_id,
    body: input.body,
  });
  return {
    id: message.id,
    created_at: message.createdAt.toISOString(),
  };
}
