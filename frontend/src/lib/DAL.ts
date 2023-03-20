export default interface DAL {
  owner: () => Promise<any>;
  votingParameters:() => Promise<any>;
  getVotingOptions:() => Promise<any>;
  voters:(address: string) => Promise<any>;
  getRegisteredVoters:(start: number, limit: number) => Promise<any>;
  vote:(voteOption: number) => Promise<any>;
  registerVoter:(address: string) => Promise<any>;
  setVotingPeriod:(votingStart: number, votingEnd: number) => Promise<any>;
};
