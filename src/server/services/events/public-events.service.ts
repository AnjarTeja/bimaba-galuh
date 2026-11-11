import type { EventQuerySchema } from "@/contracts/events";
import { listPublicEvents } from "@/server/repositories/events/public-events.repository";
import type { z } from "zod";

type EventQuery = z.infer<typeof EventQuerySchema>;

export async function listPublicEventsForSite(
  query: EventQuery,
  page: { skip: number; take: number },
) {
  const [events, total] = await listPublicEvents({
    branch: query.branch,
    category: query.category,
    from: query.from,
    to: query.to,
    skip: page.skip,
    take: page.take,
  });
  return {
    data: events.map(({ media, ...event }) => ({
      ...event,
      media: media
        .filter(({ mediaAsset }) => mediaAsset.consents.length > 0)
        .map(({ mediaAssetId }) => ({
          id: mediaAssetId,
          url: `/api/v1/public/media/${mediaAssetId}`,
        })),
    })),
    total,
  };
}
