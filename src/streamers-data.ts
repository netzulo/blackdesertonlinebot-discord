/**
 * List of popular Black Desert Online Twitch streamers
 * This data is manually curated from Twitch's Black Desert category
 * https://www.twitch.tv/directory/category/black-desert
 * 
 * Note: Garmoth URLs are only included when streamers have publicly
 * shared their gear links in their Twitch profile or stream panels.
 */

export interface StreamerData {
  twitch_username: string;
  display_name?: string;
  garmoth_url?: string;
  notes?: string;
}

export const STREAMERS: StreamerData[] = [
  // These are placeholder entries based on popular BDO streamers
  // In a real implementation, you would need to:
  // 1. Visit https://www.twitch.tv/directory/category/black-desert
  // 2. Check each streamer's profile at https://www.twitch.tv/{username}/about
  // 3. Look for Garmoth.com links in their bio or panels
  
  // Example: Placeholder streamer without Garmoth URL (commented out)
  // {
  //   twitch_username: 'example_streamer1',
  //   display_name: 'Example Streamer 1',
  //   notes: 'Placeholder - No Garmoth URL found in profile',
  // },
  
  // Add streamers with Garmoth URLs here when found:
  // {
  //   twitch_username: 'actual_streamer',
  //   display_name: 'Actual Streamer',
  //   garmoth_url: 'https://garmoth.com/character/ABC123',
  //   notes: 'Found in Twitch profile panels',
  // },
];

/**
 * Get streamers that have Garmoth URLs
 */
export function getStreamersWithGear(): Array<StreamerData & { garmoth_url: string }> {
  return STREAMERS.filter((s): s is StreamerData & { garmoth_url: string } => 
    s.garmoth_url !== undefined
  );
}
