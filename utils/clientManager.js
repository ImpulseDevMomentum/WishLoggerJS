let client = null;

module.exports = {
    setClient: (discordClient) => {
        client = discordClient;
    },
    getClient: () => client
}; 