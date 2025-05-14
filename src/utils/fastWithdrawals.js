
const FAST_WITHDRAWAL_SERVERS = [
  {
    name: 'fw1.drivechain.info (L2L #1)',
    url: 'https://fw1.drivechain.info',
  },
  {
    name: 'fw2.drivechain.info (L2L #2)',
    url: 'https://fw2.drivechain.info',
  },
];

function defaultFastWithdrawalServer() {
  return FAST_WITHDRAWAL_SERVERS[0].url;
}

module.exports = {
  FAST_WITHDRAWAL_SERVERS,
  defaultFastWithdrawalServer
};