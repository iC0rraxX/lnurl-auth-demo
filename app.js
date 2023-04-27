const express = require('express');
const LnurlAuth = require('passport-lnurl-auth');
const passport = require('passport');
const session = require('express-session');
const favicon = require('serve-favicon');
const path = require('path');

const app = express();

// Configuration object for the server.
const config = {
	host: process.env.HOST || 'localhost',
	port: process.env.PORT || 3000,
	url: null,
};

// Set the URL if it's not defined in the configuration.
if (!config.url) {
	config.url = `http://${config.host}:${config.port}`;
}

// Set the view engine to Pug.
app.set('view engine', 'pug');

// Serve the favicon from the public/img directory.
app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.ico')));

// Parse incoming JSON and urlencoded data.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize the session middleware.
app.use(session({
	secret: '12345',
	resave: false,
	saveUninitialized: true,
}));

// Initialize Passport authentication middleware.
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the public directory.
app.use('/static', express.static(path.join(__dirname, 'public')));

// Create a map to store user data.
const users = new Map();

// Define the Passport serialization and deserialization functions.
passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	done(null, users.get(id) || null);
});

// Configure the LnurlAuth strategy.
passport.use(new LnurlAuth.Strategy((linkingPublicKey, done) => {
	let user = users.get(linkingPublicKey);
	if (!user) {
		user = { id: linkingPublicKey };
		users.set(linkingPublicKey, user);
	}
	done(null, user);
}));

// Use the LnurlAuth middleware for all routes.
app.use(passport.authenticate('lnurl-auth'));

// Define the root handler.
const rootHandler = (req, res) => {
	if (!req.user) {
		return res.render('index', { title: 'Login with Lightning!' });
	}
	console.log(req.user);
	res.render('authenticated', { title: 'Logged in', userid: req.user.id });
};

// Define the login handler.
const loginHandler = (req, res, next) => {
	if (req.user) {
		// Already authenticated.
		return res.redirect('/');
	}
	next();
};

// Create the LnurlAuth middleware.
const lnurlAuthMiddleware = new LnurlAuth.Middleware({
	callbackUrl: 'https://lightninglogin.live/login',
	cancelUrl: 'https://lightninglogin.live/',
	loginTemplateFilePath: path.join(__dirname, 'views', 'login.html'),
});

// Define the routes.
app.get('/', rootHandler);
app.get('/login', loginHandler, lnurlAuthMiddleware);
app.get('/logout', (req, res, next) => {
	if (req.user) {
		// Already authenticated.
		req.session.destroy();
		return res.redirect('/');
	}
	next();
});
app.get('/learn', (req, res) => {
	res.render('learn');
});

// Start the server.
const server = app.listen(config.port, () => {
	console.log(`Server listening at ${config.url}`);
});

// Handle server errors.
server.on('error', (error) => {
	console.error('Server error', error);
});

// Close the server before exiting the process.
process.on('beforeExit', () => {
	server.close
});

// Handle unhandled promise rejections.
process.on('unhandledRejection', (error) => {
	console.error('Unhandled rejection', error);
});

// Handle uncaught exceptions.
process.on('uncaughtException', (error) => {
	console.error('Uncaught exception', error);
});

// Handle the SIGINT signal.
process.on('SIGINT', () => {
	console.log('SIGINT signal received.');
	process.exit(0);
});