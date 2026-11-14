// The entry point: `npm run dev` runs this file.
import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`RoomLynk API running on http://localhost:${config.port}`);
});
