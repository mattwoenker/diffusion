function Vector2(x, y) {
    this.x = x;
    this.y = y;
}

Vector2.prototype.add = function(other) {
    return new Vector2(this.x + other.x, this.y + other.y);
};

Vector2.prototype.sub = function(other) {
    return new Vector2(this.x - other.x, this.y - other.y);
};

Vector2.prototype.scale = function(factor) {
    return new Vector2(this.x * factor, this.y * factor);
};

Vector2.prototype.dot = function(other) {
    return this.x * other.x + this.y * other.y;
};

Vector2.prototype.norm = function() {
    var length = Math.sqrt(this.x * this.x + this.y * this.y);
    return this.scale(1.0 / length);
};

Vector2.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector2.random = function(xmin, ymin, xmax, ymax) {
    return new Vector2(
        Math.random() * (xmax - xmin) + xmin,
        Math.random() * (ymax - ymin) + ymin,
    );
}

function Particle(position, velocity) {
    this.position = position;
    this.velocity = velocity;
}

Particle.prototype.update = function() {
    this.position = this.position.add(this.velocity);
};

Particle.prototype.draw = function(draw_ctx) {
    /* draw_ctx */
};

function Line(v1, v2) {
    this.v1 = v1;
    this.v2 = v2;
    this.norm = new Vector2(v1.y - v2.y, v2.x - v1.x).norm();
    this.offset = v1.dot(this.norm);
}

Line.prototype.distance_to = function(v) {
    return v.dot(this.norm) - this.offset;
}

Line.prototype.collision = function(start, end) {
    // return param of point on line (between 0 and 1) where collision happens
    var start_dist = this.distance_to(start);
    var end_dist = this.distance_to(end);
    if (start_dist >= 0 && end_dist < 0) {
        var path_t = start_dist / (start_dist - end_dist)
        var collision_point = start.add(end.sub(start).scale(path_t));
        var direction = this.v2.sub(this.v1);
        var v1_t = direction.dot(this.v1);
        var v2_t = direction.dot(this.v2);
        var collision_t = direction.dot(collision_point);
        if (v1_t <= collision_t && collision_t <= v2_t) {
            return path_t;
        }
    }

    return 1.0;
};

function Collision(t, line) {
    this.t = t;
    this.line = line;
}

function Scene(canvas, time_step) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.time_step = time_step;
    var width = canvas.width;
    var height = canvas.height;

    var corners = [
        new Vector2(0, 0),
        new Vector2(width, 0),
        new Vector2(width, height),
        new Vector2(0, height),
    ];

    this.lines = [];

    for (var i = 0; i < corners.length; ++i) {
        this.lines.push(
            new Line(corners[i], corners[(i + 1) % corners.length]));
    }

    var num_segs = 6;
    var seg_length = height / num_segs;
    for (var i = 0; i < num_segs; ++i) {
        var top = seg_length * i + 0.1 * seg_length;
        var bottom = seg_length * i + 0.9 * seg_length;
        var corners = [
            new Vector2(width/2 - 8, top),
            new Vector2(width/2 - 8, bottom),
            new Vector2(width/2 + 8, bottom),
            new Vector2(width/2 + 8, top),
        ]
        for (var j = 0; j < corners.length; ++j) {
            this.lines.push(new Line(
                corners[j],
                corners[(j + 1) % corners.length]));
        }
    }

    var max_v = 20;
    this.particles = [];
    for (var i = 0; i < 10000; ++i) {
        this.particles.push(new Particle(
            Vector2.random(0, 0, width / 2 - 8, height),
            Vector2.random(-max_v, -max_v, max_v, max_v),
        ));
    }
};

Scene.prototype.set_time_step = function(new_step) {
    this.time_step = new_step;
};

Scene.prototype.nearest_collision = function(start, end) {
    var nearest_collision = 1.0;
    var collision_line = null;
    
    for (var i = 0; i < this.lines.length; ++i) {
        var line = this.lines[i];
        collision = line.collision(start, end);
        if (collision < nearest_collision) {
            nearest_collision = collision;
            collision_line = line;
        }
    }

    if (nearest_collision < 1.0) {
        return new Collision(nearest_collision, collision_line);
    }
};

Scene.prototype.update = function() {
    for (var i = 0; i < this.particles.length; ++i) {
        var particle = this.particles[i];
        var time_step = this.time_step;
        var start = particle.position;

        var collisions = [];
        var end = particle.position.add(particle.velocity.scale(time_step));
        while (true) {
            var collision = this.nearest_collision(start, end);

            if (! collision) {
                break;
            }
            collisions.push(collision)
            if (collisions.length > 50) {
                console.log('Too many collisions!');
                console.log(collisions);
                document.querySelector('#stop_button').dispatchEvent(
                    new Event('click'));
                break;
            }

            var collision_point = start.add(end.sub(start).scale(collision.t));
            var tangent_component = particle.velocity.dot(collision.line.norm);
            time_step = time_step * (1 - collision.t);
            particle.velocity = particle.velocity.sub(
                collision.line.norm.scale(2 * tangent_component));
            end = start.add(particle.velocity.scale(time_step));
        }

        particle.position = end;
    }
};

Scene.prototype.draw = function() {
    var context = this.context;
    context.fillStyle = 'white';
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    context.fillStyle = 'black';
    for (var i = 0; i < this.particles.length; ++i) {
        var particle = this.particles[i];
        context.fillRect(particle.position.x - 1, particle.position.y - 1, 3, 3)
    }

    context.strokeStyle = 'blue';
    context.lineWidth = 4;
    for (var i = 0; i < this.lines.length; ++i) {
        var line = this.lines[i];
        context.beginPath();
        context.moveTo(line.v1.x, line.v1.y);
        context.lineTo(line.v2.x, line.v2.y);
        context.stroke();
    }
};

window.addEventListener('load', function() {
    canvas = document.querySelector('canvas');

    var delay = 50;
    var time_multiplier = 1.0;
    
    var scene = new Scene(canvas, delay * time_multiplier / 1000.0);
    var interval = setInterval(
        function() {
            scene.update();
            scene.draw();
        },
        delay
    );

    stop_button = document.querySelector('#stop_button');
    stop_button.addEventListener('click', function() {
        clearInterval(interval);
    });

    slider = document.querySelector('#time_multiplier');
    slider.addEventListener('change', function() {
        time_multiplier = this.value;
        scene.set_time_step(delay * time_multiplier / 1000.0);
        console.log(scene.time_step);
    })
})
