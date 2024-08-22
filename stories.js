"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;



async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  const hostName = story.getHostName();
  const isFavorite = currentUser ? currentUser.isFavorite(story) : false;
  const favoriteClass = isFavorite ? "favorite" : "not-favorite";
  const isOwnStory = currentUser ? currentUser.ownStories.some(s => s.storyId === story.storyId) : false;

  return $(`
    <li id="${story.storyId}">
      ${isOwnStory ? '<button class="delete-btn">🗑️</button>' : ''}
      <span class="favorite-btn ${favoriteClass}">★</span>
      <a href="${story.url}" target="a_blank" class="story-link">
        ${story.title}
      </a>
      <small class="story-hostname">(${hostName})</small>
      <small class="story-author">by ${story.author}</small>
      <small class="story-user">posted by ${story.username}</small>
    </li>
  `);
}

$body.on("click", ".favorite-btn", async function(evt) {
  const $target = $(evt.target);
  const storyId = $target.closest("li").attr("id");
  const story = storyList.stories.find(s => s.storyId === storyId);

  if ($target.hasClass("favorite")) {
    await currentUser.removeFavorite(story);
    $target.removeClass("favorite").addClass("not-favorite");
  } else {
    await currentUser.addFavorite(story);
    $target.removeClass("not-favorite").addClass("favorite");
  }
});


/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}


document.getElementById('story-form').addEventListener('submit', async function(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const storyData = {
    title: formData.get('title'),
    author: formData.get('author'),
    url: formData.get('url')
  };

  try {
    const newStory = await storyList.addStory(currentUser, storyData);

    renderStory(newStory);
    
    document.getElementById('new-story-form').style.display = 'none';
    
  } catch (error) {
    console.error('Error adding story:', error);
  }
});

function renderStory(story) {
  const storiesContainer = document.getElementById('stories-container');
  
  const storyElement = document.createElement('div');
  storyElement.innerHTML = `
    <h2>${story.title}</h2>
    <p>by ${story.author}</p>
    <a href="${story.url}" target="_blank">${story.url}</a>
  `;
  
  storiesContainer.appendChild(storyElement);
}

function putFavoritesOnPage() {
  console.debug("putFavoritesOnPage");

  $allStoriesList.empty();

  if (currentUser.favorites.length === 0) {
    $allStoriesList.append("<h5>No favorites added yet!</h5>");
  } else {
    for (let story of currentUser.favorites) {
      const $story = generateStoryMarkup(story);
      $allStoriesList.append($story);
    }
  }

  $allStoriesList.show();
}

$body.on("click", ".delete-btn", async function(evt) {
  const $target = $(evt.target);
  const storyId = $target.closest("li").attr("id");
  const story = storyList.stories.find(s => s.storyId === storyId);

  try {
    // Remove story from the API and user list
    await currentUser.deleteStory(story);
    
    // Remove story from the DOM
    $target.closest("li").remove();
    
    // Optionally refresh the list of stories
    // await getAndShowStoriesOnStart(); // Uncomment if needed
  } catch (err) {
    console.error("Error deleting story:", err);
  }
});

