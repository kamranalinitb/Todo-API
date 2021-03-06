const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb'); 

const { app } = require('./../server');
const { Todo } = require('./../models/todo');
const { User } = require('./../models/user');
const { todos, populateTodos, users, populateUsers } = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {

  it('Should create a new TODO', (done) => {
    var text = 'Test todo text';

    request(app)
      .post('/todos')
      .set('x-auth', users[0].tokens[0].token)
      .send({ text: text })
      .expect(200)
      .expect((res) => {
        expect(res.body.text).toBe(text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.find({ text }).then((todos) => {
          expect(todos.length).toBe(1);
          expect(todos[0].text).toBe(text);
          done();
        }).catch((err) => {
          done(e);
        })
      })
  });

  it('Should not create a new TODO with invalid body data', (done) => {

    request(app)
      .post('/todos')
      .set('x-auth', users[0].tokens[0].token)
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.find().then((todos) => {
          expect(todos.length).toBe(2);
          done();
        }).catch((err) => {
          done(e);
        })
      })
  });
});

describe('GET /todos', () => {
  it('Should GET all TODOs', (done) => {

    request(app)
      .get('/todos')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todos.length).toBe(1);
      })
      .end(done);
  });
});

describe('GET /todos/:id', () => {
  it('Should return todo doc', (done) => {

    request(app)
      .get(`/todos/${todos[0]._id.toHexString()} `)
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(todos[0].text);
      })
      .end(done);
  });

  it('Should return 404 if Todo not found', (done) => {

    var hexid = new ObjectID().toHexString();

    request(app)
      .get(`/todos/${hexid}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('Should return 404 for non Object IDs', (done) => {

    request(app)
      .get('/todos/123abc')
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('Should return not return a todo doc created by other user', (done) => {

    request(app)
      .get(`/todos/${todos[1]._id.toHexString()} `)
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });
});

describe('DELETE /todos/:id', () => {
  it('Should remove a todo', (done) => {

    var hexid = todos[1]._id.toHexString();

    request(app)
      .delete(`/todos/${hexid}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo._id).toBe(hexid);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.findById(hexid).then((todo) => {
          expect(todo).toBeFalsy();
          done();
        }).catch((e) => done(e));
      });
  });
  
  it('Should remove a todo', (done) => {

    var hexid = todos[0]._id.toHexString();

    request(app)
      .delete(`/todos/${hexid}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.findById(hexid).then((todo) => {
          expect(todo).toBeTruthy();
          done();
        }).catch((e) => done(e));
      });
  })


  it('Should return 404 if todo not found', (done) => {

    var hexid = new ObjectID().toHexString();

    request(app)
      .delete(`/todos/${hexid}`)
      .set('x-auth', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  })

  it('Should return 404 if object ID is invalid', (done) => {

    request(app)
    .delete('/todos/123abc')
    .set('x-auth', users[1].tokens[0].token)
    .expect(404)
    .end(done);
  })
})

describe('PATCH /todos/:id', () => {

  it('Should update the todo', (done) => {
    var hexid = todos[0]._id.toHexString();
    var text = 'New Text';

    request(app)
    .patch(`/todos/${hexid}`)
    .set('x-auth', users[0].tokens[0].token)
    .send({
      completed: true,
      text: text
    })
    .expect(200)
    .expect((res) => {
      expect(res.body.todo.text).toBe(text);
      expect(res.body.todo.completed).toBe(true);
      expect(typeof res.body.todo.completedAt).toBe('number');
    })
    .end(done)
  
  });

  it('Should not update the todo created by other user', (done) => {
    var hexid = todos[0]._id.toHexString();
    var text = 'New Text';

    request(app)
    .patch(`/todos/${hexid}`)
    .set('x-auth', users[1].tokens[0].token)
    .send({
      completed: true,
      text: text
    })
    .expect(404)
    .end(done)
  });

  it('Should clear completedAt when todo is not completed', (done) => {

    var hexid = todos[1]._id.toHexString();
    var text = 'New Text';

    request(app)
    .patch(`/todos/${hexid}`)
    .set('x-auth', users[1].tokens[0].token)
    .send({
      completed: false,
      text: text
    })
    .expect(200)
    .expect((res) => {
      expect(res.body.todo.text).toBe(text);
      expect(res.body.todo.completed).toBe(false);
      expect(res.body.todo.completedAt).toBeFalsy();
    })
    .end(done)
  
  });
})

describe('GET /users/me', () => {
  it('Should return user if authenticated', (done) => {
    request(app)
    .get('/users/me')
    .set('x-auth', users[0].tokens[0].token)
    .expect(200)
    .expect((res) => {
      expect(res.body._id).toBe(users[0]._id.toHexString());
      expect(res.body.email).toBe(users[0].email);
    })
    .end(done);
  });

  it('Should return a 401 if not authenticated', (done) => {
    request(app)
    .get('/users/me')
    .expect(401)
    .expect((res) => {
      expect(res.body).toEqual({});
    })
    .end(done);
  });
});

describe('POST /users', () => {

  it('should create a user', (done) => {
    var email = 'example@example.com';
    var password = '123mnb!';

    request(app)
      .post('/users')
      .send({email, password})
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toBeTruthy();
        expect(res.body._id).toBeTruthy();
        expect(res.body.email).toBe(email);
      })
      .end((err) => {
        if (err) {
          return done(err);
        }

        User.findOne({email}).then((user) => {
          expect(user).toBeTruthy();
          expect(user.password).not.toBe(password);
          done();
        }).catch((e) => done(e));
      });
  });


  it('Should return validation error if request invalid', (done) => {
    
    var email = 'example';
    var password = '123';

    request(app)
      .post('/users')
      .send({email, password})
      .expect(400)
      .end(done);
  });

  it('Should create not create user if email in use', (done) => {
    
    var password = '123mnb!';

    request(app)
      .post('/users')
      .send({email: users[0].email, password})
      .expect(400)
      .end(done);
  });
})

describe('POST /users/login', () => {
  it('Should login user and return Auth Token', (done) => {

    request(app)
      .post('/users/login')
      .send({email: users[1].email, password: users[1].password})
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toBeTruthy();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        User.findById(users[1]._id).then((user) => {
          expect(user.toObject().tokens[1]).toMatchObject({
            access: 'auth',
            token: res.headers['x-auth']
          });
          done();
        }).catch((err) => {
          done(err);
        })
      });
  });

  it('Should reject invalid login', (done) => {

    request(app)
      .post('/users/login')
      .send({email: users[1].email, password: users[1].password + '1'})
      .expect(400)
      .expect((res) => {
        expect(res.headers['x-auth']).toBeFalsy();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        User.findById(users[1]._id).then((user) => {
          expect(user.tokens.length).toBe(1);
          done();
        }).catch((err) => {
          done(err);
        })
      });
  });
});

describe('DELETE /users/me/token' , () => {

  it('Should remove Auth token on Logout', (done) => {

    request(app)
    .delete('/users/me/token')
    .set('x-auth', users[0].tokens[0].token)
    .expect(200)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      User.findById(users[0]._id).then((user) => {
        expect(user.tokens.length).toBe(0);
        done();
      }).catch((err) => {
        done(err);
      })
    });
  });
})