/// <reference path="../definitions/jquery/jquery.d.ts" />
/// <reference path="../definitions/spotify/spotify-web-api.d.ts" />
/// <reference path="../definitions/jso/jso.d.ts" />

class Login {


    private CLIENT_ID: string;
    private REDIRECT_URI: string;

    private jso: JSO;  
    private token: any;
    private spotifyApi: any;
    private userId: string;
    private arrTracksByPlaylist: Array<any>;

    constructor( clientId: string, redirectUri: string ){

        this.CLIENT_ID = clientId;
        this.REDIRECT_URI = redirectUri;

        this.jso = new JSO({
            providerID: "spotify",
            client_id: this.CLIENT_ID,
            redirect_uri: this.REDIRECT_URI,
            authorization: "https://accounts.spotify.com/authorize?",
            scopes: { request: ["user-read-email"]},
        });
        this.jso.callback();

        this.token = this.jso.checkToken();

        this.arrTracksByPlaylist = [];

        this.spotifyApi = new SpotifyWebApi();

        if( this.token ) {

            this.spotifyApi.setAccessToken( this.token.access_token );
            this.spotifyApi.getMe()
                .then( (data: any ) => {
                    this.userId = data.id;
                    return this.spotifyApi.getUserPlaylists( this.userId );
                })
                .then( (data: any ) => {
                    return this.normalizePlaylists(data.items);
                })
                .then( () => {
                    let src = this.arrTracksByPlaylist[0].tracks[0].preview_url;
                    let audio = new Audio(src);
                    
                    $('#play').on('click touched', () => {
                        audio.play();
                    })
                })
        }
    }

    private msToTime( duration: number ): string {

        let milliseconds = Math.round((duration%1000)/100)
        let seconds = Math.round((duration/1000)%60)
        let minutes = Math.round((duration/(1000*60))%60)
        let hours =  Math.round(duration/(1000*60*60))%24;

        let sHours = (hours < 10) ? "0" + hours : hours;
        let sMinutes = (minutes < 10) ? "0" + minutes : minutes;
        let sSeconds = (seconds < 10) ? "0" + seconds : seconds;

        return sHours + ":" + sMinutes + ":" + sSeconds + "." + milliseconds;
    }

    private normalizeTracks( arrTracks: any ): any {

        let arr = [];
        let duration = 0;
        $.each( arrTracks, (iItem, item) => {
                            
            duration += item.track.duration_ms;
            if ( item.track.preview_url ) {
                arr.push( {
                    name: item.track.name,
                    preview_url: item.track.preview_url,
                } );
            }
        });

        return { arr, duration };
    }

    private normalizePlaylist( playlist, duration, tracks ): any {

        return {
            name: playlist.name,
            duration_ms: duration,
            duration: this.msToTime(duration),
            tracks: tracks
        }
    }

    private normalizePlaylists( arrPlaylists: any ): Promise<Object> {

        return new Promise( ( resolve, reject ) => {

            let totalToResolve = arrPlaylists.length;
            $.each( arrPlaylists, ( iPlaylist, playlist ) => {
                
                this.spotifyApi.getPlaylist( this.userId, playlist.id )
                    .then( ( data: any ) => {
                        let tracks = this.normalizeTracks( data.tracks.items );
                        let list = this.normalizePlaylist( playlist, tracks.duration, tracks.arr) ;
                        this.arrTracksByPlaylist.push( list );

                        totalToResolve--;
                        if( totalToResolve <= 0 ) {
                            resolve();
                        }
                    });
            } );
        });
    }

    getAccess () {
        this.jso.getToken( (token: any) => {
            console.log("I got the token: ", token);
        });
    }

    logout() {
        this.jso.wipeTokens();
    }
}