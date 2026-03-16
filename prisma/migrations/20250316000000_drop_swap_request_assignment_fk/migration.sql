-- DropForeignKey: Remove FK from swap_requests to shift_assignments so approving a swap
-- (delete requester assignment, create receiver assignment) does not cascade-delete the swap.
ALTER TABLE "swap_requests" DROP CONSTRAINT IF EXISTS "swap_requests_shift_id_requester_id_fkey";
