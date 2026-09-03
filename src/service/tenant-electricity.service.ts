import { ObjectId } from "mongodb";
import { rooms } from "../modals/room.modal";
import { tenants } from "../modals/tenant.modal";

export const distributeRoomElectricity = async (
  businessId: ObjectId,
  roomId: ObjectId,
) => {
  const [room, roomTenants] = await Promise.all([
    rooms().findOne({ _id: roomId, businessId }),
    tenants()
      .find({ businessId, roomId })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray(),
  ]);

  if (!room || roomTenants.length === 0) return;

  const electricityPerTenant = room.amount / roomTenants.length;

  await tenants().updateMany(
    {
      businessId,
      roomId,
      _id: { $in: roomTenants.map((tenant) => tenant._id) },
    },
    {
      $set: {
        electricity: electricityPerTenant,
        updatedAt: new Date(),
      },
    },
  );
};
