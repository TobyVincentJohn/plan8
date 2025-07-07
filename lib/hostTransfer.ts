import { supabase } from './supabaseClient';

export async function transferHostOnLeave(groupId: string, leavingUserId: string) {
  try {
    // Check if the leaving user is the host
    const { data: groupData, error: groupError } = await supabase
      .from('travel_groups')
      .select('host_id')
      .eq('group_id', groupId)
      .single();

    if (groupError) {
      console.error('Error checking group host:', groupError);
      return false;
    }

    // If the leaving user is not the host, no need to transfer
    if (groupData.host_id !== leavingUserId) {
      return true;
    }

    // Get remaining group members (excluding the leaving user)
    const { data: remainingMembers, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .neq('user_id', leavingUserId);

    if (membersError) {
      console.error('Error getting remaining members:', membersError);
      return false;
    }

    // If no remaining members, the group should be deleted
    if (!remainingMembers || remainingMembers.length === 0) {
      const { error: deleteError } = await supabase
        .from('travel_groups')
        .delete()
        .eq('group_id', groupId);

      if (deleteError) {
        console.error('Error deleting empty group:', deleteError);
        return false;
      }
      return true;
    }

    // Select a random member to be the new host
    const randomIndex = Math.floor(Math.random() * remainingMembers.length);
    const newHostId = remainingMembers[randomIndex].user_id;

    // Update the group with the new host
    const { error: updateError } = await supabase
      .from('travel_groups')
      .update({ host_id: newHostId })
      .eq('group_id', groupId);

    if (updateError) {
      console.error('Error transferring host:', updateError);
      return false;
    }

    console.log(`Host transferred from ${leavingUserId} to ${newHostId} for group ${groupId}`);
    return true;
  } catch (error) {
    console.error('Error in host transfer process:', error);
    return false;
  }
}