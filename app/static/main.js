let socket = io.connect('https://' + document.domain + ':' + location.port);
var username;
var nickname_prev;
var nickname;
var keys;
var server_public_key = null;
var online_users = null;


// EXAMPLE USE OF FUNCTIONS
async function testEncryptDecrypt(){
    console.log("Creating keys")
    keys = await createKeys()
    message = "hi bby"
    encoded = await encodeMessage(message)
    encrypted = await encryptData(encoded, keys.publicKey)
    decrypted = await decryptData(encrypted, keys.privateKey)
    decoded = await decodeMessage(decrypted)
    console.log("Printing decrypted message")
    console.log(decoded)
}

function createKeys(){
    return crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048, //can be 1024, 2048, or 4096
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
        },
        false, //whether the key is extractable (i.e. can be used in exportKey)
        ["encrypt", "decrypt"] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
    )
}

function encryptData(data, publicKey){
    return crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
            //label: Uint8Array([...]) //optional
        },
        publicKey, //from generateKey or importKey above
        data //ArrayBuffer of data you want to encrypt
    )
}

function decryptData(data, privateKey){
    return crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
            //label: Uint8Array([...]) //optional
        },
        privateKey, //from generateKey or importKey above
        data //ArrayBuffer of the data
    )
}

function encodeMessage(message){
    let encoder = new TextEncoder();
    return encoder.encode(message);
}

function decodeMessage(message){
    let decoder = new TextDecoder();
    return decoder.decode(message)
}




// Event Listeners
document.getElementById("submit").addEventListener("click", handle_login);
document.getElementById("login_view").children[0].children[1].addEventListener("keyup", function(e) {
    if (e.keyCode == 13)
        document.getElementById("login_view").children[0].children[3].focus();
});
document.getElementById("login_view").children[0].children[3].addEventListener("keyup", function(e) {
    if (e.keyCode == 13)
        handle_login();
});
document.getElementById("nickname").addEventListener("keydown", function(e) {
    if (e.keyCode == 13) {
        document.getElementById("nickname").blur();
        e.preventDefault();
        return false;
    }
});
document.getElementById("nickname").addEventListener("paste", function(e) {  // disable pasting to prevent newline
    e.preventDefault();
    return false;
});
document.getElementById("nickname").addEventListener("focus", function(e) {
    nickname_prev = nickname;
});
document.getElementById("nickname").addEventListener("blur", function(e) {
    nickname = document.getElementById("nickname").innerHTML;
    if (nickname != nickname_prev) {
        socket.emit('update', {
            username : username,
            nickname : nickname
        });
    }
});



// Sockets
socket.on('connect', function() {
    var form = $('form' ).on( 'submit', function( e ) {
        e.preventDefault()
        let user_name = $( 'input.username' ).val()
        let user_input = $( 'input.message' ).val()

        var usernames = []

        for (var username in online_users)  // this is extracting username (or key) from the json
            usernames.push(username)

        socket.emit( 'message', {
            sender : user_name,
            recipient : username[0],
            message : user_input
        })
        $( 'input.message' ).val( '' ).focus()
    })
});

socket.on('user list', function(user_list) {
    online_users = user_list;
    chat = document.getElementById("online_users");
    html = '';

    for (var user in online_users) { // this is extracting username (or key) from the json
        if (user == username)
            continue;

        html += '<div class="user" id="';
        html += user;
        html += '"><div class="flex-container"><img src="static/img/avatar.png") }}"><div class="username">';
        html += online_users[user]['nickname'];
        html += '</div><div class="notification">0</div></div><div class="divider"></div></div>';
    }

    if (html == '') {
        html = '<p>...looks like no one is online...</p>';
    }

    chat.innerHTML = html;
    setTimeout(function(){
        socket.emit('request user list');
    }, 5000);
});

socket.on('public key', function(data){
    console.log(data);
    server_public_key = data['public_key'];
    document.getElementById("login_view").classList.add("hidden");
});

socket.on('message', function( msg ) {
    console.log( msg )
    if( typeof msg.sender !== 'undefined' ) {
    $( 'h3' ).remove()
    $( 'div.message_holder' ).append( '<div><b style="color: #000">'+msg.sender+'</b> '+msg.message+'</div>' )
    }
});




async function handle_login() {
    login_card = document.getElementById("login_view").children[0];
    username = login_card.children[1].value;
    nickname = login_card.children[3].value;

    if (username != "") {
        if (nickname == "")
            nickname = username;

        document.getElementById("nickname").innerHTML = nickname;
        color_strip = document.getElementsByClassName("color_strip")[0];
        color_strip.classList.add("green");
        color_strip.classList.remove("yellow");
        keys = await createKeys();
        console.log(keys.publicKey);
        socket.emit('join', {
            username: username,
            nickname: nickname,
            public_key: ""
        });
    } else {
        login_card.children[1].classList.add("error");
        setTimeout(function(){
            login_card.children[1].classList.remove('error');
        }, 500);
        login_card.children[1].focus();
    }
}


// Sockets
