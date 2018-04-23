var vertexShaderText =
    [
        'precision mediump float;',
        '',
        'attribute vec3 vertPosition;',
        '',
        'uniform mat4 model;',
        'uniform mat4 view;',
        'uniform mat4 projection;',
        '',
        'void main()',
        '{',
        '   gl_PointSize = 4.0;',
        '   gl_Position = projection * view * model * vec4(vertPosition, 1.0);',
        '}'
    ].join('\n');

var fragmentShaderText =
    [
        'precision mediump float;',
        '',
        'uniform vec3 meshColor;',
        '',
        'void main()',
        '{',
        '   gl_FragColor = vec4(meshColor, 1.0);',
        '}'
    ].join('\n');

var Data = {};

var CreateShader = function (gl, type, source, name) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('ERROR (', name, '):', gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var CreateProgram = function (gl, vertex, fragment) {
    var vertexShader = CreateShader(gl, gl.VERTEX_SHADER, vertex, 'vertex shader');
    if (!vertexShader) return null;
    var fragmentShader = CreateShader(gl, gl.FRAGMENT_SHADER, fragment, 'fragment shader');
    if (!fragmentShader) return null;

    Data.program = gl.createProgram();
    gl.attachShader(Data.program, vertexShader);
    gl.attachShader(Data.program, fragmentShader);
};

var GetContext = function (id) {
    Data.canvas = document.getElementById(id);
    Data.canvas.width = window.innerWidth;
    Data.canvas.height = window. innerHeight;

    Data.gl = Data.canvas.getContext('webgl');

    if (!Data.gl) {
        console.log('WebGL not fully supported, using experimental-webgl');
        Data.gl = Data.canvas.getContext('experimental-webgl');
    }

    if (!Data.gl) {
        alert('Your browser does not support WebGL');
    }
};

var GLInit = function () {
    GetContext('game-view');

    Data.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    Data.gl.clear(Data.gl.COLOR_BUFFER_BIT | Data.gl.DEPTH_BUFFER_BIT);

    CreateProgram(Data.gl, vertexShaderText, fragmentShaderText);
    if (!Data.program) return;

    Data.gl.linkProgram(Data.program);

    if (!Data.gl.getProgramParameter(Data.program, Data.gl.LINK_STATUS)) {
        console.error('ERROR (', 'linking', '):', Data.gl.getProgramInfoLog(Data.program));
        return;
    }

    Data.gl.useProgram(Data.program);
    Data.gl.enable(Data.gl.DEPTH_TEST);
};

var MakeRect = function (x, y, width, height, color, layer) {
    var rect = {};

    rect.vertexCount = 3;
    rect.vertices =
        [
            -width / 2,  height / 2, layer,
             width / 2,  height / 2, layer,
             width / 2, -height / 2, layer,
            -width / 2, -height / 2, layer
        ];

    rect.color = color;

    rect.x = x;
    rect.y = y;

    rect.layer = layer;

    rect.vertexBuffer = Data.gl.createBuffer();
    Data.gl.bindBuffer(Data.gl.ARRAY_BUFFER, rect.vertexBuffer);
    Data.gl.bufferData(Data.gl.ARRAY_BUFFER, new Float32Array(rect.vertices), Data.gl.STATIC_DRAW);

    return rect;
};

var MakePlayer = function (gfx, up, down) {
    var player = {};

    player.gfx = gfx;
    player.y = 0;
    player.up = up;
    player.down = down;
    player.dir = 0;
    player.speed = 0.005;
    player.upDownBound = 1.45;
    player.isMoving = 0;
    Data.dynamicObjects.push(player.gfx);

    return player;
};

var DataInit = function () {
    Data.animation = {};
    Data.staticObjects = [];
    Data.dynamicObjects = [];

    Data.player1 = MakePlayer(MakeRect(-4.5, 0, 0.2, 1, [0.5, 0, 0.5], 2), 87, 83);
    Data.player2 = MakePlayer(MakeRect(4.5, 0, 0.2, 1, [0.5, 0, 0.5], 2), 73, 75);

    Data.ball = {};
    Data.ball.gfx = MakeRect(0, 0, 0.2, 0.2, [0, 0.5, 0.5], 1);
    Data.ball.x = 0;
    Data.ball.y = 0;
    Data.ball.dir = [1, 1];
    Data.ball.upDownBound = 1.85;
    Data.ball.sideBound = 4.8;
    Data.ball.speed = 0.006;
    Data.dynamicObjects.push(Data.ball.gfx);

    Data.staticObjects.push(MakeRect(0, 2, 9.5, 0.1, [0.3, 0.3, 0.3], 3));
    Data.staticObjects.push(MakeRect(0, -2, 9.5, 0.1, [0.3, 0.3, 0.3], 3));

    var i;
    var minMax = 6;
    var density = 1.0 / 3.0;
    for (i = -minMax; i <= minMax; i = i + 1) {
        Data.staticObjects.push(MakeRect(0, i * density, 0.1, 0.1, [0.2, 0.2, 0.2], 4));
    }

    Data.staticObjects.push(MakeRect(0, 0, 9.5, 4, [0.1, 0.0, 0.0], 5));
};

var MVPInit = function () {
    Data.modelLocation = Data.gl.getUniformLocation(Data.program, 'model');
    Data.viewLocation = Data.gl.getUniformLocation(Data.program, 'view');
    Data.projectionLocation = Data.gl.getUniformLocation(Data.program, 'projection');

    Data.modelMatrix = new Float32Array(16);
    Data.viewMatrix = new Float32Array(16);
    Data.projectionMatrix = new Float32Array(16);

    var ratio = Data.canvas.width / Data.canvas.height;

    Data.scale = 5;
    mat4.identity(Data.modelMatrix);
    mat4.lookAt(Data.viewMatrix, [0, -5, -1], [0, 0, 0], [0, 1, 0]);
    mat4.perspective(Data.projectionMatrix, Math.PI / 3.0, ratio, 0.00001, 100);
    // mat4.ortho(Data.projectionMatrix, Data.scale, -Data.scale, -ratio * Data.scale, ratio * Data.scale, 0, 100);

    Data.gl.uniformMatrix4fv(Data.modelLocation, Data.gl.FALSE, Data.modelMatrix);
    Data.gl.uniformMatrix4fv(Data.viewLocation, Data.gl.FALSE, Data.viewMatrix);
    Data.gl.uniformMatrix4fv(Data.projectionLocation, Data.gl.FALSE, Data.projectionMatrix);
};

var Init = function () {
    GLInit();
    DataInit();
    MVPInit();

    // AnimationStart();
    Draw();
};

var AnimatePlayer = function (player, deltaTime) {
    player.y = player.y + player.dir * player.speed * deltaTime;
    if (player.y > player.upDownBound) player.y = player.upDownBound;
    else if (player.y < -player.upDownBound) player.y = -player.upDownBound;

    player.gfx.y = player.y;
};

var ResetGame = function () {
    Data.ball.x = 0;
    Data.ball.y = 0;
    Data.ball.gfx.x = Data.ball.x;
    Data.ball.gfx.y = Data.ball.y;

    Data.ball.dir[0] = (Math.random() > 0.5) ? 1 : -1;
    Data.ball.dir[1] = 0;

    Data.player1.y = 0;
    Data.player1.gfx.y = Data.player1.y;
    Data.player1.dir = 0;

    Data.player2.y = 0;
    Data.player2.gfx.y = Data.player2.y;
    Data.player2.dir = 0;

    AnimationStop();
};

var AnimateBall = function (deltaTime) {
    var dirLength = Math.sqrt(Data.ball.dir[0] * Data.ball.dir[0] + Data.ball.dir[1] * Data.ball.dir[1]);
    if (dirLength === 0) dirLength = 1;

    // Horizontal movement
    var x = Data.ball.x + Data.ball.dir[0] / dirLength * Data.ball.speed * deltaTime;
    if (x > Data.ball.sideBound) {
        console.log('Point to Player 1');
        ResetGame();
        return false;
        // x = Data.ball.sideBound;
        // Data.ball.dir[0] *= -1;
    }
    else if (x < -Data.ball.sideBound) {
        console.log('Point to Player 2');
        ResetGame();
        return false;
        // x = -Data.ball.sideBound;
        // Data.ball.dir[0] *= -1;
    }

    // Vertical movement
    var y = Data.ball.y + Data.ball.dir[1] / dirLength * Data.ball.speed * deltaTime;
    if (y > Data.ball.upDownBound) {
        y = Data.ball.upDownBound;
        Data.ball.dir[1] *= -1;
    }
    else if (y < -Data.ball.upDownBound) {
        y = -Data.ball.upDownBound;
        Data.ball.dir[1] *= -1;
    }

    // Collision with Player 1
    if (Data.ball.x > -4.3 && x < -4.3) {
        if (y > Data.player1.y - 0.6 && y < Data.player1.y + 0.6) {
            Data.ball.dir[0] = 1;
            Data.ball.dir[1] = 1 - (Data.player1.y - y) / 0.4;
        }
    }

    // Collision with Player 2
    if (Data.ball.x < 4.3 && x > 4.3) {
        if (y > Data.player2.y - 0.6 && y < Data.player2.y + 0.6) {
            Data.ball.dir[0] = -1;
            Data.ball.dir[1] = 1 - (Data.player2.y - y) / 0.4;
        }
    }

    Data.ball.x = x;
    Data.ball.y = y;
    Data.ball.gfx.x = Data.ball.x;
    Data.ball.gfx.y = Data.ball.y;

    return true;
};

var Animate = function(time) {
    var deltaTime = time - Data.animation.lastTime;
    Data.animation.lastTime = time;

    AnimatePlayer(Data.player1, deltaTime);
    AnimatePlayer(Data.player2, deltaTime);
    if (!AnimateBall(deltaTime)) {
        return;
    }

    Draw();
    Data.gl.finish();
    Data.animation.requestId = window.requestAnimationFrame(Animate);
};

var AnimationStart = function () {
    Data.animation.lastTime = window.performance.now();
    Data.animation.requestId = window.requestAnimationFrame(Animate);
};

var AnimationStop = function () {
    if (Data.animation.requestId) {
        window.cancelAnimationFrame(Data.animation.requestId);
    }
    Data.animation.requestId = 0;

    Draw();
};

var DrawArray = function (objects) {
    var i;
    var max = objects.length;
    var colorLocation = Data.gl.getUniformLocation(Data.program, 'meshColor')

    for (i = 0; i < max; i = i + 1) {
        Data.gl.bindBuffer(Data.gl.ARRAY_BUFFER, objects[i].vertexBuffer);

        Data.modelMatrix = new Float32Array(16);

        mat4.identity(Data.modelMatrix);
        mat4.translate(Data.modelMatrix, Data.modelMatrix, [objects[i].x, objects[i].y, 0.0]);

        Data.gl.uniformMatrix4fv(Data.modelLocation, Data.gl.FALSE, Data.modelMatrix);

        var positionAttribLocation = Data.gl.getAttribLocation(Data.program, 'vertPosition');
        Data.gl.vertexAttribPointer(
            positionAttribLocation,
            objects[i].vertexCount,
            Data.gl.FLOAT,
            Data.gl.FALSE,
            objects[i].vertexCount * Float32Array.BYTES_PER_ELEMENT,
            0
        );
        Data.gl.enableVertexAttribArray(positionAttribLocation);

        Data.gl.uniform3fv(colorLocation, objects[i].color);
        Data.gl.drawArrays(Data.gl.TRIANGLE_FAN, 0, 4);
    }
};

var Draw = function () {
    Data.gl.clear(Data.gl.COLOR_BUFFER_BIT | Data.gl.DEPTH_BUFFER_BIT);

    DrawArray(Data.staticObjects);
    DrawArray(Data.dynamicObjects);
};

window.onkeydown = function (e) {
    var code = e.which || e.keyCode;

    switch (code)
    {
        case Data.player1.up:
            Data.player1.dir = 1;
            break;
        case Data.player1.down:
            Data.player1.dir = -1;
            break;
        case Data.player2.up:
            Data.player2.dir = 1;
            break;
        case Data.player2.down:
            Data.player2.dir = -1;
            break;
        case 13:
            if (Data.animation.requestId === 0) {
                AnimationStart();
            } else {
                AnimationStop();
            }
            break;
    }
};

window.onkeyup = function (e) {
    var code = e.which || e.keyCode;

    switch (code)
    {
        case Data.player1.up:
            if (Data.player1.dir === 1) Data.player1.dir = 0;
            break;
        case Data.player1.down:
            if (Data.player1.dir === -1) Data.player1.dir = 0;
            break;
        case Data.player2.up:
            if (Data.player2.dir === 1) Data.player2.dir = 0;
            break;
        case Data.player2.down:
            if (Data.player2.dir === -1) Data.player2.dir = 0;
            break;
    }
};

window.onresize = function () {
    if (Data.canvas && Data.gl) {
        Data.canvas.width = window.innerWidth;
        Data.canvas.height = window.innerHeight;
        var ratio = Data.canvas.width / Data.canvas.height;

        Data.gl.viewport(0, 0, Data.canvas.width, Data.canvas.height);

        Data.projectionMatrix = new Float32Array(16);
        mat4.perspective(Data.projectionMatrix, Math.PI / 3.0, ratio, 0.00001, 100);
        // mat4.ortho(Data.projectionMatrix, Data.scale, -Data.scale, -ratio * Data.scale, ratio * Data.scale, 0, 100);
        Data.gl.uniformMatrix4fv(Data.projectionLocation, Data.gl.FALSE, Data.projectionMatrix);

        Draw();
    }
};
