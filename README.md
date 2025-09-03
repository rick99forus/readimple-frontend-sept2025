# README for the Readimple Frontend Application

## Overview

The Readimple frontend application is built using React and Tailwind CSS. It provides a user-friendly interface for browsing books across various genres, featuring a hero slideshow and a tab bar for easy navigation.

## Project Structure

The frontend application is organized as follows:

```
frontend
├── public
│   ├── index.html          # Main HTML file for the React app
│   ├── manifest.json       # Metadata for the web app
│   └── robots.txt          # Controls search engine indexing
├── src
│   ├── App.js              # Main component that sets up routing
│   ├── index.js            # Entry point for the React application
│   ├── index.css           # Global styles including Tailwind CSS
│   ├── components
│   │   ├── TabBar.js       # Navigation component for the app
│   │   ├── HeroSlideshow.js # Slideshow component for featured books
│   │   └── BookRow.js      # Component to display rows of books by genre
│   └── pages
│       ├── Home.js         # Home page with hero slideshow and genres
│       ├── Genre1.js       # Page for Genre 1 books
│       ├── Genre2.js       # Page for Genre 2 books
│       ├── Genre3.js       # Page for Genre 3 books
│       └── Genre4.js       # Page for Genre 4 books
├── tailwind.config.js      # Configuration for Tailwind CSS
├── package.json             # Dependencies and scripts for the frontend
└── README.md                # Documentation for the frontend application
```

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd readimple-app/frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Application**
   ```bash
   npm start
   ```
   This will start the development server and open the application in your default web browser at [http://localhost:3000](http://localhost:3000).

## Features

- **Tab Bar Navigation**: Easily navigate between the Home page and four genre-specific pages.
- **Hero Slideshow**: A dynamic slideshow showcasing featured books.
- **Genre Rows**: Each genre page displays a row of book covers and titles, allowing users to explore books by category.

## Backend Integration

The frontend is designed to work with a backend that interacts with the Google Books API. Ensure that the backend is set up and running to fetch book data.

We are only using the ean-13 code to use for physical books to gather details to fetch from the google books api and translate to open ai based on this. 

## Environment Variables

Make sure to set up your backend `.env` file with the necessary API keys to access the Google Books API.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Kill frontend

lsof -ti:3000 | xargs kill -9

npm start