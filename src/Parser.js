const dJSON = require('dirty-json');
const { EMBED_URL } = require('./constants');

class Parser {
    async getUserObject(page, username) {
        try {
            const html = await page.evaluate(() => document.querySelector('html').innerHTML);
            const { data } = dJSON.parse(html.split('window.__sc_hydration =')[1].split('</script>')[0].replace(';', ''))[5];
            return data;
        } catch (error) {
            throw new Error(`Failed to parse user object for ${username}: ${error}`);
        }
    }

    createUserObject(json) {
        try {
            return {
                id: json.id,
                creationDate: json.created_at,
                lastModifiedDate: json.last_modified,
                url: json.permalink_url,
                username: json.username,
                fullName: json.full_name,
                avatar: json.avatar_url,
                banner: json?.visuals?.visuals[0].visual_url ?? null,
                location: json.city,
                countryCode: json.country_code,
                verified: json.verified,
                subscriptions: json.creator_subscriptions,
                description: json.description,
                followersCount: json.followers_count,
                followingCount: json.followings_count,
                likesCount: json.likes_count,
                playlistCount: json.playlist_count,
                tracksCount: json.track_count,
            };
        } catch (error) {
            throw new Error(`Failed to parse a user object: ${error}`);
        }
    }

    createTrackObject(track) {
        try {
            return {
                id: track.id,
                title: track.title,
                publishDate: track.created_at,
                description: track.description,
                genre: track.genre,
                thumbnail: track.artwork_url,
                url: track.permalink_url,
                plays: track.playback_count,
                likes: track.likes_count,
                commentCount: track.comment_count,
                downloadable: track.downloadable,
                downloadCount: track.download_count,
                embedLink: `${EMBED_URL}${track.permalink_url}`,
            };
        } catch (error) {
            throw new Error(`Failed to parse a track object: ${error}`);
        }
    }

    createCommentsObjects(comments) {
        try {
            return comments.map((obj) => {
                return {
                    id: obj.id,
                    date: obj.created_at,
                    user: {
                        id: obj.user.id,
                        username: obj.user.username,
                        url: obj.user.permalink_url,
                    },
                    body: obj.body,
                };
            });
        } catch (error) {
            throw new Error(`Failed to parse comments: ${error}`);
        }
    }
}

module.exports = new Parser();
