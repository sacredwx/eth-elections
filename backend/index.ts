import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Eth from './src/eth';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/vote', async (req: Request, res: Response) => {
  try {
    return res.json(await Eth.vote(
      req.body.v,
      req.body.r,
      req.body.s,
      req.body.signer,
      req.body.deadline,
      req.body.voteOption,
    ));
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

app.post('/registerVoter', async (req: Request, res: Response) => {
  try {
    return res.json(await Eth.registerVoter(
      req.body.v,
      req.body.r,
      req.body.s,
      req.body.signer,
      req.body.deadline,
      req.body.address,
    ));
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

app.post('/setVotingPeriod', async (req: Request, res: Response) => {
  try {
    return res.json(await Eth.setVotingPeriod(
      req.body.v,
      req.body.r,
      req.body.s,
      req.body.signer,
      req.body.deadline,
      req.body.votingStart,
      req.body.votingEnd,
    ));
  } catch (e) {
    return res.status(500).json({ error: e });
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
