var vertexShaderText =
    [
        'precision mediump float;',
        '',
        'attribute vec2 vertPosition;',
        '',
        'uniform vec3 meshColor;',
        '',
        'void main()',
        '{',
        '   gl_PointSize = 4.0;',
        '   gl_Position = vec4(vertPosition, 0.0, 1.0);',
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

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    return program;
}

var GetContext = function (id) {
    var canvas = document.getElementById(id);
    var gl = canvas.getContext('webgl');

    types.push(gl.POINTS);
    types.push(gl.LINE_STRIP);
    types.push(gl.LINE_LOOP);
    types.push(gl.LINES);
    types.push(gl.TRIANGLE_STRIP);
    types.push(gl.TRIANGLE_FAN);
    types.push(gl.TRIANGLES);

    if (!gl) {
        console.log('WebGL not fully supported, using experimental-webgl');
        gl = canvas.getContext('experimental-webgl');
    }

    if (!gl) {
        alert('Your browser does not support WebGL');
    }

    return gl;
};

var Draw;
var types = [];

var Init = function (index) {
    var gl = GetContext('game-view');

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var vertices =
        [ //   x     y
            -0.5 , -0.5 ,
            -0.25,  0.5 ,
            0.0 , -0.4 ,
            0.1 ,  0.5 ,
            0.3 , -0.6 ,
            0.5 ,  0.6
        ];

    var program = CreateProgram(gl, vertexShaderText, fragmentShaderText);
    if (!program) return;

    if (index >= 0) {
        console.log('Binding to:', index);
        gl.bindAttribLocation(program, index, 'vertPosition');
    }

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('ERROR (', 'linking', '):', gl.getProgramInfoLog(program));
        return;
    }

    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        positionAttribLocation,                 // Attribute location
        2,                                      // Number of elements per attribute
        gl.FLOAT,                               // Type of the elements
        gl.FALSE,                               //
        2 * Float32Array.BYTES_PER_ELEMENT,     // Size of an individual vertex
        0                                       // Offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(positionAttribLocation);

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    Draw = function (type, r, g, b) {
        var colorLocation = gl.getUniformLocation(program, 'meshColor');

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform3f(colorLocation, r, g, b);
        gl.drawArrays(types[type], 0, 6);

        if (type === 4 || type === 5) {
            gl.uniform3f(colorLocation, 1.0, 1.0, 1.0);
            gl.drawArrays(gl.LINE_STRIP, 0, 6);
        }

        const numAtt = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < numAtt; ++i) {
            const info = gl.getActiveAttrib(program, i);
            console.log(
                'attribute:', info.name,
                'type:', info.type,
                'size:', info.size,
                'location:', gl.getAttribLocation(program, info.name)
            );
        }

        const numUni = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < numUni; ++i) {
            const info = gl.getActiveUniform(program, i);
            console.log(
                'uniform:', info.name,
                'type:', info.type,
                'size:', info.size
            );
        }
    }
};

var Bind = function (index) {
    Init(index);
}