/// <reference path="Login.ts" />

class Main {
    
    private login: Login;

    private CLIENT_ID: string;
    private REDIRECT_URI: string;

    constructor() {
        
        this.CLIENT_ID = 'daf6432fc84f43b588ab20c29c854aef';
        this.REDIRECT_URI = 'http://localhost:8080/callback';
        this.login = new Login(this.CLIENT_ID, this.REDIRECT_URI);

        this.init();
    }

    private init() {

        $('#login').on( 'click', () => {

            this.login.getAccess()
        });
        $('#logout').on( 'click', () => {

            this.login.logout()
        });

    }
}

let main = new Main();
