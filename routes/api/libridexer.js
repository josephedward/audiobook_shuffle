const axios = require("axios");
const _ = require("lodash");
const cheerio = require("cheerio");
const chalk = require("chalk");
const router = require("express").Router();
const { parse, stringify } = require("flatted");
// const CSVToJSON = require('csvtojson');

let book = {};

const csvFilePath = "./combined_recommendations_v1.csv";
const csv = require("csvtojson");

async function findBookRecs(bookTitle) {
  let recommendations = await csv().fromFile(csvFilePath);
  console.log(chalk.red("findBookRecs()"));
  try {
    console.log(chalk.red("try"));
    rec_list = [];
    // var obj = JSON.parse(result);
    let keys = Object.keys(recommendations);
    // console.log(chalk.red("keys: "), keys)
    for (var i = 0; i < keys.length; i++) {
      console.log(recommendations[keys[i]].book_title);
      if (bookTitle.includes(recommendations[keys[i]].book_title)) {
        console.log(
          "found: ",
          typeof recommendations[keys[i]].book_recommendation_urls
        );

        rec_list = recommendations[keys[i]].book_recommendation_urls;
        rec_list = rec_list.replace("[", "");
        rec_list = rec_list.replace("]", "");
        
        // rec_list = rec_list.replace("/", "");
        rec_list = rec_list.split(",");

        console.log(chalk.magenta(rec_list));
        let tempList = [];

        for (var x of rec_list) {
          // const matches = string.match(/\bhttp?::\/\/\S+/gi);
          console.log("rec_list ->", x.toString());
          try {
            tempList.push(await buildRecObj(x))
          } catch (error) {
            console.log(error.message)
          }
        }
        console.log("tempList: ", chalk.red(tempList));

        return rec_list;
      }
    }
  } catch (err) {
    console.log(err.message);
  }
}

async function buildRecObj(url) {
  url = url.replace("[", " ");
  url = url.replace("[", " ");

  rec = {};
  console.log(chalk.cyan("building book Rec obj..."));
  console.log("build url -> ", url);
  // try {
  page = await axios
    .get(url)
    .then(async = (response) =>{
      console.log("response :", response);
      return response.data;
    })
    .catch((error) => {
      console.log(chalk.red(error));
    });

  let $ = cheerio.load(page);
  rec.bkTitle = $(".book-page-book-cover").next("h1").text();
  rec.bkImage = $(".book-page-book-cover").children().attr("src");
  rec.bkAuthor = $(".book-page-author").text();
  rec.link = url;
  console.log(rec);
  return rec;
}

getGenreLBVX = (genre) => {
  console.log(chalk.green("contacting librivox"));
  return axios.get(
    `https://librivox.org/api/feed/audiobooks/genre/^${genre}?format=json`
  );
};


getSpecificBookLBVX = (id) => {
  console.log(chalk.green("contacting librivox"));
  return axios.get(`https://librivox.org/api/feed/audiobooks/id/${id}`);
};

async function getRecs(bookTitle){
  console.log(chalk.green("getting recommendations from flask server: ", bookTitle));
try{
  return await axios.get(encodeURI(`http://127.0.0.1:5000/recommend_static/${bookTitle}/`))
  // return await axios.get(encodeURI(`https://gentle-tundra-97522.herokuapp.com/recommend_static/${bookTitle}`))
}
catch(err){
    console.log(err.message)
}
}


//build book object
async function buildBookObj(page) {
  console.log(chalk.green("building book object"));
  let $ = cheerio.load(page.data);
  book.bkTitle = $(".book-page-book-cover").next("h1").text();
  // try {
  //   book.bkRecs = await getRecs(book.bkTitle);
  // } catch (error) {
  //   console.log(error);
  // }
  try{
      book.bkRecs=await findBookRecs(book.bkTitle)
    }catch{
      console.log(error);
    }
  


  book.bkAuthor = $(".book-page-author").text();
  book.bkDescription = $(".description").text();
  book.bkImage = $(".book-page-book-cover").children().attr("src");
  book.CHS = [];
  $(".chapter-name").each(function (i, element) {
    let chapter = {};
    chapter.chTitle = $(element).text();
    chapter.chLink = $(element).attr("href");
    book.CHS.push(chapter);
  });
  console.log(Object.values(book));
  return book;
}

searchGenre = (genre) => {
  return getGenreLBVX(genre)
    .then((res) => {
      const books = res.data.books;
      const { url_librivox, id } = books[
        Math.floor(Math.random() * books.length)
      ];
      book.bkID = id;
      book.bkURL = url_librivox;
      return axios.get(url_librivox);
    })
    .then(buildBookObj);
};

getSpecificBook = (id) => {
  return getSpecificBookLBVX(id)
    .then((res) => {
      const books = res.data.books;
      const { url_librivox } = books[Math.floor(Math.random() * books.length)];
      return axios.get(url_librivox);
    })
    .then(buildBookObj);
};

searchGenre("");

// buildRecObj('https://librivox.org/the-odyssey-by-homer/')
// getSpecificBook(65)

//should match to /api/audiobook
router.route("/").get(
  function (req, res) {
    res.json(book);
  }
  // book
);

router.route("/genre/:id").get(async function (req, res) {
  console.log(req.params.id);
  try {
    await searchGenre(req.params.id).then((bookData) => res.json(bookData));
  } catch (err) {
    console.log(err.message);
  }
});

router.route("/book/:id").get(async function (req, res) {
  console.log(req.params.id);
  await getSpecificBook(req.params.id).then((bookData) => res.json(bookData));
});

module.exports = router;
