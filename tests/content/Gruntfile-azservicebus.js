module.exports = function (grunt) {

    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        protractor: {

            connector_azservicebus_smoke: {
                options: {
                    keepAlive: false,
                    configFile: "./WI/config/protractorwiConf.js",
                    args: {
                        specs: ['./connectors/azservicebus/content/tests/wi_AzureServiceBus.js']
                    }
                }
            },

            connector_azservicebus_uat: {
                options: {
                    keepAlive: false,
                    configFile: "./WI/config/protractorwiConf.js",
                    args: {
                        specs: ['./connectors/azservicebus/content/tests/wi_AzureServiceBus.js']
                    }
                }
            }
        }
    });

    grunt.registerTask('test:connector_azservicebus_smoke', ['protractor:connector_azservicebus_smoke']);
    grunt.registerTask('test:connector_azservicebus_uat', ['protractor:connector_azservicebus_uat']);

};
