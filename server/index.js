const express = require('express');
const db = require('../db-psql');
//add load balancer
const cluster = require('cluster')
const numCPUs = require('os').cpus().length;
//add db caching tool
const ExpressRedisCache = require('express-redis-cache');

const app = express();
const PORT = 3000;
const cache = ExpressRedisCache();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  app.listen(PORT, err => {
    err ?
    console.log("Error in server setup") :
    console.log(`Worker ${process.pid} started`);
  });

  app.get('/qa/questions/test', (req, res) => {
    res.send('this is a testing endpoint');
  });

  //loader.io auth
  app.get('/loaderio-8e182296fa73e5283e7f0f48c410dfc0/', (req, res)=> {
    res.send('loaderio-8e182296fa73e5283e7f0f48c410dfc0');
  })

  app.get('/qa/questions', cache.route(), (req, res) => {
    // console.log('REQ PARAM ', req.params);
    // console.log('REQ BODY ', req.body);
    // console.log('REQ QUERY ', req.query);
    if (!req.query.product_id) {
      res.send('no product id provided, try again...')
    }
    db.getQsByProductId(req.query.product_id, req.query.page||1, req.query.count||5, (err, result) => {
      if (err) {
        console.log('failed to get Qs from server');
        res.sendStatus(404);
      }
      res.status(200).json(result);
    })
  });

  app.get('/qa/questions/:question_id/answers', (req, res) => {
    // console.log('REQ QUERY ', req.query);
    // console.log('REQ PARAM ', req.params);
    db.getAnsByQId(req.params.question_id, req.query.page||1, req.query.count||5, (err, result) => {
      if (err) {
        console.log('failed to get answer list from server');
        res.sendStatus(404);
      }
      res.status(200).json(result);
    })
  });

  app.post('/qa/questions', (req, res) => {
    console.log('REQ BODY ', req.body);
    db.addQ(req.body, (err, result) => {
      if (err) {
        console.log('failed to post newq to server');
        res.sendStatus(404);
      }
      res.status(201).send('Created');
    })
  });

  app.post('/qa/questions/:question_id/answers', (req, res) => {
    console.log('REQ BODY ', req.body);
    db.addAns(req.params.question_id, req.body, (err, result) => {
      if (err) {
        console.log('failed to post new Answer to server');
        res.sendStatus(404);
      }
      res.status(201).send('Created');
    })
  });

  app.put('/qa/questions/:question_id/helpful', (req, res) => {
    db.markQhelpfull(req.params.question_id, (err, result) => {
      if (err) {
        console.log('failed to mark Q helpful via server');
        res.sendStatus(404);
      }
      res.sendStatus(204);
    })
  });

  app.put('/qa/answers/:answer_id/helpful', (req, res) => {
    db.markAhelpful(req.params.answer_id, (err, result) => {
      if (err) {
        console.log('failed to mark A helpful via server');
        res.sendStatus(404);
      }
      res.sendStatus(204);
    })
  });

  app.put('/qa/questions/:question_id/report', (req, res) => {
    db.reportQ(req.params.question_id, (err, result) => {
      if (err) {
        console.log('failed to report Q via server');
        res.sendStatus(404);
      }
      res.sendStatus(204);
    })
  });

  app.put('/qa/answers/:answer_id/report', (req, res) => {
    db.reportA(req.params.answer_id, (err, result) => {
      if (err) {
        console.log('failed to report A via server');
        res.sendStatus(404);
      }
      res.sendStatus(204);
    })
  });

}


// app.listen(PORT, () => {
//   console.log(`listening on port ${PORT}`);
// });


