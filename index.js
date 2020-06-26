const fs = require("fs");
const path = require("path");
const StreamZip = require('node-stream-zip');
const { info } = require("console");
const parseString = require('xml2js').parseString;
const Iconv = require('iconv').Iconv;

const booksDir = path.resolve(__dirname, "books");

const booksPaths = fs.readdirSync(booksDir).map(bookPath => path.resolve(booksDir, bookPath));
const booksPromised = booksPaths.map(getBookContentPromised);

Promise.all(booksPromised).then(booksArray => {
    const booksMap = new Map();
    booksArray.forEach(([bookObj, bookPath]) => {
        // Не успеваю. На этом моменте осталось три минуты.
        // Планировал сгрупировать по автору в booksMap
        // Далее планировал отсортировать уже внутри booksMap или что-то такое
        // Всё, что в рамках Promise.all ниже этого комментария - дописано после отмеченных четырёх часов, если там вообще что-то будет
        const info = bookObj.FictionBook.description[0]["title-info"][0];
        const author = info.author[0]["first-name"] + " " + info.author[0]["last-name"];
        const title = info["book-title"][0];

        let thisAuthorBooks = [];
        if (booksMap.has(author)) {
            thisAuthorBooks = booksMap.get(author);
        } else {
            booksMap.set(author, thisAuthorBooks);
        }

        // Book title sorting
        const firstBookOfAuthor = thisAuthorBooks[0];
        if (firstBookOfAuthor && title <= firstBookOfAuthor.title) {
            thisAuthorBooks.unshift({ title, bookPath });
        } else {
            thisAuthorBooks.push({ title, bookPath });
        }
    })
    const booksArrAuthorSorted = [...booksMap.entries()].sort(([authorA, booksA], [authorB, booksB]) => {
        if (authorA < authorB) {
            return -1;
        }
        return 1;
    });
    booksArrAuthorSorted.forEach(([author, books]) => {
        console.log(`Author: ${author}`);
        console.log("  Books:");
        books.forEach((book, index, books) => {
            console.log(`    title: ${book.title}`);
            console.log(`    path: ${book.bookPath}`);
            if (index !== books.length - 1) {
                console.log("    ===========");
            };
        });
    })
    // Закончил. Превысил время на 45 минут.
});

function getBookContentPromised(bookPath) {
    return new Promise((resolve, reject) => {
        const extname = path.extname(bookPath);

        if (extname === ".zip") {
            const zip = new StreamZip({
                file: bookPath,
                storeEntries: true
            });
            zip.on("ready", () => {
                const { name } = Object.values(zip.entries())[0];
                const data = zip.entryDataSync(name);
                readXmlData(data, bookPath, resolve);
            })
        } else {
            fs.readFile(bookPath, (err, data) => {
                readXmlData(data, bookPath, resolve);
            })
        }
    });
}

function readXmlData(data, bookPath, resolve) {
    const encoding = getXmlEncoding(data);

    const conv = Iconv(encoding, "utf8");
    const xml = conv.convert(data).toString();

    parseString(xml, (err, result) => {
        resolve([result, bookPath]);
    })
}

function getXmlEncoding(data) {
    return data.toString("utf-8").match(/(?:encoding=")(.+?)"/)[1];
}
