const AUTH0_CLIENT_ID = "dmqpp8JCTrx4rdzdOKqFWwRWcPz4q3H0";
const AUTH0_DOMAIN = "quotable-dt.auth0.com";
const AUTH0_CALLBACK_URL = location.href;
const AUTH0_API_AUDIENCE = "http://dark-tower-quotes.com";


class App extends React.Component {
    parseHash() {
        this.auth0 = new auth0.WebAuth({
            domain: AUTH0_DOMAIN,
            clientID: AUTH0_CLIENT_ID
        });
        this.auth0.parseHash(window.location.hash, (err, authResult) => {
            if (err) {
                return console.error(err)
            }
            if (
                authResult !== null &&
                authResult.accessToken !== null &&
                authResult.idToken !== null
            ) {
                localStorage.setItem("access_token", authResult.accessToken);
                localStorage.setItem("id_token", authResult.idToken);
                localStorage.setItem("profile", JSON.stringify(authResult.idTokenPayload));
                window.location = window.location.href.substr(0, window.location.href.indexOf("#"));
            }
        })
    }

    setup() {
        $.ajaxSetup({
            beforeSend: (r) => {
                if (localStorage.getItem("access_token")) {
                    r.setRequestHeader(
                        "Authorization",
                        "Bearer " + localStorage.getItem("access_token")
                    );
                }
            }
        });
    }

    setState() {
        let idToken = localStorage.getItem("id_token");
        if (idToken) {
            this.loggedIn = true;
        } else {
            this.loggedIn = false;
        }
    }

    componentWillMount() {
        this.setup();
        this.parseHash();
        this.setState();
    }


    render() {
        if (this.loggedIn) {
            return (<LoggedIn />)
        } else {
            return (<Home />)
        }
    }
}


class Home extends React.Component {
    constructor(props) {
        super(props);
        this.authenticate = this.authenticate.bind(this)
    }

    authenticate() {
        this.webAuth = new auth0.WebAuth({
            domain: AUTH0_DOMAIN,
            clientID: AUTH0_CLIENT_ID,
            scope: "openid profile",
            audience: AUTH0_API_AUDIENCE,
            responseType: "token id_token",
            redirectUrl: AUTH0_CALLBACK_URL
        });
        this.webAuth.authorize()
    }

    render() {
        return (
            <div className="container">
                <div className="col-xs-8 col-xs-offset-2 jumbotron text-center">
                    <h1>Quotable</h1>
                    <p>The best Dark Tower series quote site</p>
                    <p>Sign in to get access </p>
                    <a onClick={this.authenticate} className="btn btn-primary btn-lg btn-login btn-block">Sign In</a>
                </div>
            </div>
        )
    }
}

class LoggedIn extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            quotes: []
        };
        console.log(this.state);
        this.serverRequest = this.serverRequest.bind(this);
        this.logout = this.logout.bind(this);
    }

    logout() {
        localStorage.removeItem("id_token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("profile");
        location.reload();
    }

    serverRequest() {
        $.get("http://localhost:3003/api/quotes", (resp) => {
            // console.log(resp);
            this.setState({
                quotes: JSON.parse(resp)
            });
        })
    }

    componentDidMount() {
        this.serverRequest();
    }

    render() {
        return (
            <div className="container">
                <div className="col-lg-12">
                    <br/>
                    <span className="pull-right"><a onClick={this.logout}>Log out</a></span>
                    <h2>Quotable</h2>
                    <p>Best Dark Tower series quotes</p>
                    <div className="row">
                        {this.state.quotes.map(function (quote, i) {
                            return (<Quote key={i} quote={quote}/>);
                        })}
                    </div>
                </div>
            </div>
        )
    }
}

class Quote extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            liked: ""
        };
        this.like = this.like.bind(this);
        this.serverRequest = this.serverRequest.bind(this);
    }

    like() {
        let quote = this.props.quote;
        this.serverRequest(quote);
    }

    serverRequest(quote) {
        $.post(
            "http://localhost:3003/api/quotes/like/" + quote.id,
            {like: 1},
            resp => {
                console.log("response:", resp);
                this.setState({liked: "Liked!", quotes: JSON.parse(resp)});
                this.props.quotes = JSON.parse(resp);
            }
        )
    }

    render() {
        return (
            <div className="col-xs-4">
                <div className="panel panel-default">
                    <div className="panel-heading">#{this.props.quote.id} <span
                        className="pull-right">{this.state.liked}</span></div>
                    <div className="panel-body">
                        {this.props.quote.quote}
                    </div>
                    <div className="panel-footer">
                        {this.props.quote.likes} Likes &nbsp;
                        <a onClick={this.like} className="btn btn-default">
                            <span className="glyphicon glyphicon-thumbs-up"></span>
                        </a>
                    </div>
                </div>
            </div>
        )
    }
}

ReactDOM.render(<App />, document.getElementById("app"));