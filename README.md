# Property scraper
This project lets a user scrape Rightmove, Zoopla and OnTheMarket links to find and sort by square footage, distance to nearest station, and bedroom size.

The user provides links and an API key -> The program returns a filterable web page with results from all 3 sites.

Note: Your API Key is only ever sent to open-ai's API.

# Setup

You will need a `.env` file at the top level with the following property: 

```
OPENAI_API_KEY=sk-************ // your API key
```

Install the scraper with `npm install .`

Install the frontend with `cd src/web` then `npm install .`

You must then set a link in each of `run-zoopla/rightmove/onthemarket-scrape.ts` in one of the categories. This is a standard paginated search link for each of the sites. It's highly recommended that your search is filtered by price, location, no. bedrooms (the things you can ordinarily filter by).

In `set-category.ts` set your category. Categories are effectively aggregate properties to a search link - it's set up so that if you've scraped a link in one category it doesn't re-scrape in another, saving time and OpenAI billing costs.

# Running

You can run each scraper in a separate terminal with: 

`npm run scrape-rightmove`

`npm run scrape-onthemarket`

`npm run scrape-zoopla`

You can run the site with (in `./`):

`npm run web`
