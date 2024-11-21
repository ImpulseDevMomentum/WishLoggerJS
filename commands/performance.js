const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const os = require('os');
const process = require('process');
const si = require('systeminformation');
const { allowedUserIds } = require('../utils/allowedUsers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('performance')
        .setDescription('Check wish performance via command'),

    async execute(interaction) {
        if (!allowedUserIds.includes(interaction.user.id)) {
            return interaction.reply({
                content: '<:PermDenied:1248352895854973029> You do not have permission to use this command.',
                ephemeral: true
            });
        }

        try {
            const [cpu, mem, disk, net] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.fsSize(),
                si.networkStats()
            ]);

            const cpuUsage = cpu.currentLoad.toFixed(2);
            const cpuCount = os.cpus().length;

            const totalMemory = (mem.total / (1024 ** 3)).toFixed(2);
            const usedMemory = ((mem.total - mem.available) / (1024 ** 3)).toFixed(2);
            const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

            const mainDisk = disk[0];
            const totalDisk = (mainDisk.size / (1024 ** 3)).toFixed(2);
            const usedDisk = (mainDisk.used / (1024 ** 3)).toFixed(2);
            const diskUsagePercent = mainDisk.use.toFixed(2);

            const networkStats = net[0];
            const bytesSent = (networkStats.tx_bytes / (1024 ** 2)).toFixed(2);
            const bytesReceived = (networkStats.rx_bytes / (1024 ** 2)).toFixed(2);

            const uptime = (os.uptime() / 3600).toFixed(2);

            const embed = new EmbedBuilder()
                .setTitle('Server Performance Stats')
                .setColor('#00FF00')
                .addFields(
                    {
                        name: 'CPU Usage',
                        value: `${cpuUsage}% (${cpuCount} cores)`,
                        inline: false
                    },
                    {
                        name: 'Memory Usage',
                        value: `${usedMemory}GB/${totalMemory}GB (${memoryUsagePercent}%)`,
                        inline: false
                    },
                    {
                        name: 'Disk Usage',
                        value: `${usedDisk}GB/${totalDisk}GB (${diskUsagePercent}%)`,
                        inline: false
                    },
                    {
                        name: 'Network Usage',
                        value: `Sent: ${bytesSent}MB\nReceived: ${bytesReceived}MB`,
                        inline: false
                    },
                    {
                        name: 'System Uptime',
                        value: `${uptime} hours`,
                        inline: false
                    },
                    {
                        name: 'Platform',
                        value: `${os.platform()} ${os.release()}`,
                        inline: false
                    }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error in performance command:', error);
            await interaction.reply({
                content: '<:NotFine:1248352479599661056> Failed to fetch performance stats.',
                ephemeral: true
            });
        }
    },
}; 