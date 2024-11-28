import { scraper } from '../twitterClient';
import { formatTimestamp } from '../../utils/formatTimestamps';
import { hasInteractedWithTweet, debugTweetInteractions } from '../../supabase/functions/tweetInteractionChecks';
import { Logger } from '../../utils/logger';

/**
 * Gets tweets from the homepage timeline
 * @param maxTweets - Maximum number of tweets to fetch (default: 20)
 * @returns Array of formatted tweet strings
 */
export async function getHomepage(maxTweets: number = 20): Promise<string[]> {
  try {
    Logger.log('Fetching homepage tweets...');
    const rawTweets: any[] = [];
    const listId = '1621164352186327041';

    // First collect all raw tweets
    const response = await scraper.fetchListTweets(listId, maxTweets);
    if (!response || !response.tweets || response.tweets.length === 0) {
      return [];
    }

    rawTweets.push(...response.tweets);
    Logger.log(`Found ${rawTweets.length} total tweets, checking for previous interactions...`);

    // Filter out already interacted tweets
    const unhandledTweets = await Promise.all(
      rawTweets.map(async (tweet) => {
        const hasInteracted = await hasInteractedWithTweet(tweet.id!);
        if (hasInteracted) {
          await debugTweetInteractions(tweet.id!);
          Logger.log(`Filtering out tweet ${tweet.id} - already interacted with`);
          return null;
        }
        return tweet;
      })
    );

    // Format remaining tweets
    return unhandledTweets
      .filter((tweet): tweet is any => tweet !== null)
      .map(tweet => {
        const timestamp = tweet.timeParsed ? 
          formatTimestamp(new Date(tweet.timeParsed)) :
          'Unknown time';
        
        return `- [${tweet.id}] @${tweet.username || 'unknown_user'} (${timestamp}): ${tweet.text}`;
      });

  } catch (error) {
    Logger.log('Error fetching homepage tweets:', error);
    return [];
  }
} 