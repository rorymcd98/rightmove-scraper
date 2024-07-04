# Property scraper
This project lets me scrape rightmove and OnTheMarket links to find and sort by square footage

You will need a `.env` file at the top level with the following property: 

```
OPENAI_API_KEY=sk-************ // your API key
```

Install with `npm install .`

You can run each scraper in a separate terminal with: 

`npm run scrape-rightmove`

`npm run scrape-onthemarket`

You can run the site with:

`npm run web`

You must manually set the two `.json` files in `App.tsx` to the latest json output in your storage folder.
