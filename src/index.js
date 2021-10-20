import { init, move, sleep } from '@kareszklub/roblib-client';
import { io } from 'socket.io-client';

await init(io, '<robot ip>'); // change to ip of the robot

// have fun
move({ left: 25, right: 25 });

await sleep(1000);

move(); // stop robot
