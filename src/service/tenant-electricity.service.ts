import { ObjectId } from "mongodb";
import { rooms } from "../modals/room.modal";
import { tenants } from "../modals/tenant.modal";

export const distributeRoomElectricity = async (
  businessId: ObjectId,
  roomId: ObjectId,
) => {
  const [room, tenantCount] = await Promise.all([
    rooms().findOne({ _id: roomId, businessId }),
    tenants().countDocuments({ businessId, roomId }),
  ]);

  if (!room || tenantCount === 0) return;

  const electricity = room.amount / tenantCount;
  await tenants().updateMany(
    { businessId, roomId },
    { $set: { electricity, updatedAt: new Date() } },
  );
};
