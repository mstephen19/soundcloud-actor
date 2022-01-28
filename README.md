## About SoundCloud Scraper

Scrape information on tracks, users, and comments with this free SoundCloud scraper. Input multiple usernames, queries, or URLs and scrape them all simultaneously.

SoundCloud is an online audio streaming service ideal for connecting emerging artists with an audience in pursuit of discovering new music. Therefore, its user base can be split into creators, listeners, and curators, who connect the two by creating playlists. The ability to comment on tracks adds a layer of interaction to the platform, and SoundCloud can therefore be viewed as [a form of social media](https://plus.inflyteapp.com/soundcloud-say-were-a-form-of-social-media/).

SoundCloud has closed its Google Form for granting developers access to its API, making gathering data from the website all the more complicated. This actor aims to fill this gap in the market by offering a quick and easy solution to scrape user info, tracks, and comments.

### Table of contents

<!-- toc start -->

-   [Features](#features)
-   [Use Cases](#use-cases)
-   [Tutorial](#tutorial)
-   [Input](#input)
-   [Output](#output)
<!-- toc end -->

## Features

By inputting a username, a keyword, or a URL, the scraper outputs the following:

-   Detailed user data
-   Detailed track data along with its URL
-   Track embed data
-   Track comments data (maximum of 300 comments)

When provided a list of usernames/queries/URLs, this actor will simultaneously scrape them, and push them all to the dataset, separated into objects titled after the input provided.

## Use Cases

-   Embedding of tracks into on-site SoundCloud widgets
-   Collecting user statistics based on their metrics
-   Gathering social media information about users
-   Discovering trends based on popular SoundCloud tracks
-   Integrating SoundCloud search results into your app

## Tutorial

-   Click the green Try for free button.
-   You will be redirected to our Apify console - sign in or create a new account.
-   Fill in the input parameters, based on your needs:
    -   Usernames: insert users you wish to scrape
    -   Keywords: insert queries with which you want to search SoundCloud and then scrape the resulted tracks
    -   URLs: insert a page that will be scraped for a list of tracks
    -   Maximum comments: insert a number in the range of 0-200 based on the number of comments you want to scrape from each track
-   Hit the Run button
-   When the scrape is complete, you will find the results in the Dataset tab, where you can export them to various formats (HTML, JSON, CSV, Excel, and XML)

## Input

| Field           | Type     | Default | Description                                                                                             |
| --------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------- |
| usernames       | array    | []      | List of SoundCloud usernames to scrape.                                                                 |
| keywords        | array    | []      | List of keywords to query and scrape results of.                                                        |
| urls            | array    | []      | List of URLs (can scrape user pages, or query pages).                                                   |
| maxComments     | number   | 0       | The maximum comments you want a track's data to have (max: 200).                                        |
| maxQueryResults | number   | 200     | The maximum number of results you want back from a keyword search (max: 500).                           |
| clientId        | string   | -       | SoundCloud API client ID. NOT REQUIRED. Leave empty to use default.                                     |
| maxConcurrency  | number   | 100     | The maximum number of operations that can happen at one time. (max: 100)                                |
| debug           | booleean | false   | Switch to true in order to receive frequent and descriptive debug logs about what the scraper is doing. |

### Example Input:

```JSON
{
    "usernames": ["k_dubs", "skrillex", "marshmellomusic", "mestomusic", "diplo", "kodak-black"],
    "keywords": ["music", "dubstep", "lofi beat", "beats", "cool", "test", "soundcloud"],
    "urls": ["soundcloud.com/martingarrix", "soundcloud.com/onstat", "https://soundcloud.com/search?q=test"],
    "maxComments": 20,
    "maxQueryResults": 300,
    "maxConcurrency": 100,
    "debug": true
}
```

## Output

Every output object will include the username/keyword it is for, as well as some information about the operation:

```JSON
{
  "house": [
    {
      "type": "query",
      "rawResults": 800
    },
  ]
}
```

### Example of output for a username query

```JSON
"Skrillex": [
  {
    "type": "user"
  },
  {
    "id": 856062,
    "creationDate": "2010-04-12T17:48:00Z",
    "lastModifiedDate": "2021-08-20T04:05:03Z",
    "url": "https://soundcloud.com/skrillex",
    "username": "Skrillex",
    "fullName": "Sonny Moore",
    "avatar": "https://i1.sndcdn.com/avatars-Hj4vOjdcx2256uzp-pqhsJQ-large.jpg",
    "banner": "https://i1.sndcdn.com/visuals-000000856062-ZA06UE-original.jpg",
    "location": "Los Angeles",
    "countryCode": "US",
    "verified": true,
    "subscriptions": [
      {
        "product": {
          "id": "creator-pro-unlimited"
        }
      }
    ],
    "description": "Twitter / TikTok / Snap: Skrillex\nButterflies with Starrah & Four Tet out now!\nskrillex.lnk.to/Butterflies\n\nGet more music from Skrillex\nSpotify: http://skrillex.me/Spotify\nApple Music: http://skrillex.me/AppleMusic\nYouTube: http://skrillex.me/YTSubscribe",
    "followersCount": 6504370,
    "followingCount": 95,
    "likesCount": 14,
    "playlistCount": 23,
    "tracksCount": 110,
    "tracks": []
```

Tracks will never be empty, however. A track object looks like this:

```JSON
{
  "id": 1108992304,
  "title": "Skrillex, Justin Bieber & Don Toliver - Don't Go",
  "publishDate": "2021-08-19T18:15:56Z",
  "description": "Skrillex, Justin Bieber & Don Toliver - Don't Go",
  "genre": "Pop",
  "thumbnail": "https://i1.sndcdn.com/artworks-udBlrInKB97ngX1E-LqKxWg-large.jpg",
  "url": "https://soundcloud.com/skrillex/skrillex-justin-bieber-don-toliver-dont-go",
  "plays": 659955,
  "likes": 17428,
  "commentCount": 474,
  "downloadable": false,
  "downloadCount": 0,
  "embedLink": "https://soundcloud.com/oembed?format=json&url=https://soundcloud.com/skrillex/skrillex-justin-bieber-don-toliver-dont-go",
  "comments": [
    {
      "id": 1602750517,
      "date": "2022-01-26T20:08:39Z",
      "user": {
        "id": 1072467712,
        "username": "Annice",
        "url": "https://soundcloud.com/user-203022854"
      },
      "body": "💛💖💜💟"
    },
    {
      "id": 1602744070,
      "date": "2022-01-26T20:01:28Z",
      "user": {
        "id": 1078473127,
        "username": "MISTYY",
        "url": "https://soundcloud.com/brundaban-nahak"
      },
      "body": "I'm addicted to this song..♥️"
    }
  ]
```

### Output for a keyword query

Keyword queries work a bit differently. By scraping by keyword, the scraper gives back the raw data SoundCloud uses from their own API. This means that every object includes a plethora of information about the result it represents.
