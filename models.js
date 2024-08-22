"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

    async toggleFavorite(currentUser) {
      if (!currentUser) throw new Error("No user is currently logged in");
  
      const method = currentUser.favorites.some(fav => fav.storyId === this.storyId)
        ? 'DELETE'
        : 'POST';
        
      const response = await fetch(`${BASE_URL}/users/${currentUser.username}/favorites/${this.storyId}`, {
        method: method,
        headers: {
          'Authorization': `Bearer ${currentUser.loginToken}`
        }
      });
  
      if (!response.ok) throw new Error("Failed to toggle favorite status");
  
      // Update the current user's favorites
      if (method === 'POST') {
        currentUser.favorites.push(this);
      } else {
        currentUser.favorites = currentUser.favorites.filter(fav => fav.storyId !== this.storyId);
      }
    }
  
  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    // UNIMPLEMENTED: complete this function!
    return "hostname.com";
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(currentUser, storyData) {
  // Check if storyData has the necessary fields
  if (!storyData.title || !storyData.author || !storyData.url) {
    throw new Error("Story data must include title, author, and url");
  }

  // Prepare the data to send
  const response = await fetch('http://yourapiurl.com/stories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentUser.token}`
    },
    body: JSON.stringify(storyData)
  });

  // Check if the response is successful
  if (!response.ok) {
    throw new Error('Failed to add story');
  }

  // Parse the response JSON
  const story = await response.json();

  // Return a new Story instance
  return new Story(story);
}

}


/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */
  
    // ... existing code ...
  
    /** Add a story to favorites or remove it if already present */
    async addFavorite(story) {
      this.favorites.push(story);
      await this._toggleFavorite("POST", story);
    }

    async removeFavorite(story) {
      this.favorites = this.favorites.filter(s => s.storyId !== story.storyId);
      await this._toggleFavorite("DELETE", story);
    }

    async _toggleFavorite(method, story) {
      const token = this.loginToken;
      await axios({
        url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
        method: method,
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    isFavorite(story) {
      return this.favorites.some(s => s.storyId === story.storyId);
    }

    async deleteStory(story) {
    
      this.ownStories = this.ownStories.filter(s => s.storyId !== story.storyId);
  
      await axios({
        url: `${BASE_URL}/stories/${story.storyId}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.loginToken}` },
      });
      
    }
  
  
  
  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }
  
    
    static async loginViaStoredCredentials(token, username) {
      try {
        const response = await axios({
          url: `${BASE_URL}/users/${username}`,
          method: "GET",
          params: { token },
        });
  
        let { user } = response.data;
  
        // Make sure user favorites are up-to-date
        return new User(
          {
            username: user.username,
            name: user.name,
            createdAt: user.createdAt,
            favorites: user.favorites, // Ensure this is properly fetched
            ownStories: user.stories
          },
          token
        );
      } catch (err) {
        console.error("loginViaStoredCredentials failed", err);
        return null;
      }
    }
  }
  


