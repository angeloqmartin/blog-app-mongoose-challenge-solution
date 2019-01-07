//////////////////////////////////// CHALLENGE ////////////////////////////////////

// => add integration tests for all four of the API endpoints. 
// => integration tests should use the strategy described in the previous assignment 
// => set up db in known state
// => make a request to API 
// => inspect response, 
// => inspect state of db, and tear down db


'use strict';

const chai = require('chai');
const chaiHTTP = require('chai-http');

//generates fake data in Node.js
const faker = require('faker');

const mongoose = require('mongoose');

// 'should' makes available throughout module
const should = chai.should();

const {BlogPost} = require('../models');
const {closeServer, runServer, app} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

// deletes db => than call 'afterEach' block
// this ensures data from one test
// dose not stick for the next
function tearDownDb() {
    return new Promise((resolve, reject) => {
        console.warn('Deleting database');
        mongoose.connection.dropDatabase()
        .then(result => resolve(result))
        .catch(err => reject(err));
    });
}

// used to put random documents in db in order 
// to have data to work with and assert
// use Faker library to generate placeholder 
// values and insert data into mongo
function seedBlogPostData() {
    console.info('seeding blog post data');
    const seedData = [];
    for (let i = 1; i <= 10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
            title: faker.lorem.sentence(),
            content: faker.lorem.text()
        });
    }
    return BlogPost.insertMany(seedData);
}

describe('blog posts API resource', function() {
    before (function () {
        return runServer(TEST_DATABASE_URL);
    });
    afterEach(function () {
        return tearDownDb();
    });

    describe('GET endpoint', function () {
        it ('should return all existing post', function () {

            // strategy:
            // 1. get back all posts returned by GET request to `/posts`
            // 2. prove res has right status, data type
            // 3. prove the number of posts we got back is equal to number in db

            let res;
            return chai.request(app)
            .get('/posts')
            .then(_res => {
                res = _res;
                res.should.have.status(200);
                res.body.should.have.lengthOf.at.least(1);
                return BlogPost.count();
            })
            .then(count => {
                // num of rtr posts should be same 
                // as num of post in DB
                res.body.should.have.lengthOf(count);
            });
        });

        it('should return posts with right fields', function () {

            // strategy: 
            // 1. Get back all posts
            // 2. ensure they have expected keys

            let resPost;
            return chai.request(app)
            .get('/posts')
            .then(function (res) {
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');
                res.body.should.have.lengthOf.at.least(1);
                res.body.forEach(function (post) {
                    post.should.be.a('object');
                    post.should.include.keys('id', 'title', 'content', 'author', 'created');
                });
                // check posts that its values match with those in db
                resPost = res.body[0];
                return BlogPost.findById(resPost.id);
            })
            .then(post => {
                resPost.title.should.equal(post.title);
                resPost.content.should.equal(post.content);
                resPost.author.should.equal(post.authorName);
            });
        });
    });

    describe('POST endpoint', function () {

        // strategy: 
        // make a POST request with data,
        // ensure POST res gets back right keys, 
        // and that `id` is there <= (proves data was inserted in db)

        it('should add a new blog post', function () {

        const newPost = {
            title: faker.lorem.sentence(),
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            },
            content: faker.lorem.text()
        };

        return chai.request(app)
            .post('/posts')
            .send(newPost)
            .then(function () {
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys(
                    'id', 'title', 'content', 'author', 'created');
                res.body.title.should.equal(newPost.title);
                res.body.id.should.not.be.null;
                res.body.another.should.equal(
                    `${newPost.author.firstName} ${newPost.author.lastName}`);
                res.body.content.should.equal(newPost.content);
                return BlogPost.findById(res.body.id);
            })

            .then(function (post) {
                post.title.should.equal(newPost.title);
                post.content.should.equal(newPost.content);
                post.author.firstName.should.equal(newPost.author.firstName);
                post.author.lastName.should.equal(newPost.author.lastName);
            });
        });
    });

    describe('PUT endpoint', function () {

        // strategy:
        //  1. Get an existing post from db
        //  2. Make a PUT request to update that post
        //  4. Prove post in db is correctly updated

        it('it should update fields you send over', function () {
            const updatedDate = {
                title: 'cats cats cats',
                content: 'dogs dogs dogs',
                author: {
                    firstName: 'reign',
                    lastName: 'doe'
                }
            };
            return BlogPost
            .findOne()
            .then(post => {
                updatedDate.id = post.id;
                return chai.request(app)
                .put(`/post/${post.id}`)
                .send(updatedDate);
            })
            .then(res => {
                res.should.have.status(204)
                return BlogPost.findById(updatedDate.id);
            })
            .then(post => {
                post.title.should.equal(updatedDate.title);
                post.content.should.equal(updatedDate.content);
                post.author.firstName.should.equal(updatedDate.author.firstName);
                post.author.lastName.should.equal(updatedDate.author.lastName);
            });
        });
    });

    describe('DELETE endpoint', function() {
        
        // strategy:
        //  1. get a post
        //  2. make a DELETE request for that post's id
        //  3. assert that response has right status code
        //  4. prove that post with the id doesn't exist in db anymore

        it('should delete a post by id', function () {
            let post;

            return BlogPost
            .findOne()
            .then(_post => {
                post = post;
                return chai.request(app).delete(`/post/${post.id}`);
            })
            .then(res => {
                res.should.have.status(204);
                return BlogPost.findById(post.id);
            })
            .then(_post => {
                should.not.exist(_post);
            });
        });
    });
});