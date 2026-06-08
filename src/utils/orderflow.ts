export const ORDER_ACTIONS: Record<string, string[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_rider", "cancelled"],
  ready_for_rider: ["cancelled"],
};
