/*
 * grunt-init-yui
 * https://gruntjs.com/
 *
 * Copyright (c) 2013 Zillow Inc., contributors
 * Licensed under the MIT license.
 */

'use strict';

// Basic template description.
exports.description = 'Create a YUI module, including YUITest unit tests and Istanbul code coverage.';

// Template-specific notes to be displayed before question prompts.
module.notes = [];

var moduleNotes = [
    '_Module name_ should be a unique ID not already in use at http://yuilibrary.com/gallery/show .',
    '_Module title_ should be a human-readable title, and doesn\'t need to contain the word "Gallery", although it may.',
    'For example, a module titled "Awesome Module" might have the name "awesome-module".',
    ''
];

var projectNotes = [
    '_Project name_ should be a unique ID, but defaulting to the current directory is likely fine.',
    '_Project title_ should be a human-readable title, and should probably describe the project.',
    'For example, a project titled "Awesome Project" might have the name "awesome-project".',
    ''
];

var moreInfoNotes = [
    'For more information, please see the following documentation:',
    '',
    'YUI Library             http://yuilibrary.com/',
    'build.json Reference    http://yui.github.io/shifter/#build.json',
    'YUI Gallery Tutorial    http://yuilibrary.com/yui/docs/tutorials/gallery/'
];

// Template-specific notes to be displayed after question prompts.
module.after = [];

var projectAfter = [
    'You should now install project dependencies with _npm install_.',
    'After that, you may execute project tasks with _grunt_.',
    'For more information about installing and configuring Grunt, please see the Getting Started guide:',
    '',
    'http://gruntjs.com/getting-started'
];

// Any existing file or directory matching this wildcard will cause a warning.
var warnOn = module.warnOn = [];
// exports.warnOn = '*';

// Fancy-pants
['notes', 'after', 'warnOn'].forEach(function (key) {
    var load = key === 'warnOn'
        ? function () { return module[key]; }
        : function () { return module[key].join('\n'); };
    Object.defineProperty(exports, key, { get: load });
});

// The actual init template.
exports.template = function (grunt, init, done) {

    // --gallery
    var needsGallery = grunt.option('gallery');

    // --project
    var projectOnly  = grunt.option('project');

    // Gruntfile.js is missing
    var needsProject = projectOnly || grunt.file.expand('Gruntfile.js').length === 0;

    if (projectOnly) {
        // templating a project only
        module.notes.push(projectNotes);
        module.notes.push(moreInfoNotes);
        module.after.push(projectAfter);
    } else if (needsProject) {
        // templating a module, but need a project too.
        module.notes.push(projectNotes);
        module.notes.push(moduleNotes);
        module.notes.push(moreInfoNotes);
        module.after.push(projectAfter);
    } else {
        // templating a module only
        module.notes.push(moduleNotes);
        module.notes.push(moreInfoNotes);
    }

    module.notes = grunt.util._.flatten(module.notes);
    module.after = grunt.util._.flatten(module.after);


    function wrapDefault(oldKey, newKey, metaObj) {
        metaObj.name = newKey;
        return grunt.util._.defaults(metaObj, init.prompts[oldKey]);
    }


    function getModulePrompts() {
        // Prompt for these values when creating a module
        return [
            wrapDefault('name', 'name', {
                // disambiguates name from project_name
                message: 'Module name'
            }),
            {
                name: 'module_type',
                message: 'Module type [js, css, widget]',
                'default': 'js',
                validator: /^(js|css|widget)$/i,
                sanitize: function (value, data, done) {
                    done(null, String(value).toLowerCase());
                }
            },
            wrapDefault('title', 'title', {
                // disambiguates title from project_title
                message: 'Module title'
            }),
            init.prompt('description', 'The best YUI module ever.')
        ];
    }

    function addModuleProperties(props) {
        var name = props.name;

        // build.json
        var build = {
            name: name,
            builds: {}
        };
        build.builds[name] = {};

        // meta/{name}.json
        var meta = {};
        meta[name] = {};

        // Change renames according to type (js, css, or widget)
        var renames = init.renames;

        switch (props.module_type) {
        case 'js':
            // don't copy css/
            renames['css/name.css'] = false;

            // don't copy assets/
            renames['assets/name/skins/sam/name-skin.css'] = false;
            renames['assets/name/skins/night/name-skin.css'] = false;
            renames['assets/name/name-core.css'] = false;

            // default requires
            meta[name].requires = ['yui-base'];

            // populate jsfiles
            build.builds[name].jsfiles = [
                'js/' + name + '.js'
            ];
            break;
        case 'css':
            // don't copy js/
            renames['js/name.js'] = false;

            // don't copy assets/
            renames['assets/name/skins/sam/name-skin.css'] = false;
            renames['assets/name/skins/night/name-skin.css'] = false;
            renames['assets/name/name-core.css'] = false;

            // don't copy tests/
            renames['tests/unit/assets/name-test.js'] = false;

            // set meta.type
            meta[name].type = 'css';

            // populate cssfiles
            build.builds[name].cssfiles = [
                'css/' + name + '.css'
            ];
            break;
        case 'widget':
            // disable css/
            renames['css/name.css'] = false;

            // widgets are skinnable and require widget
            meta[name].requires = ['widget'];
            meta[name].skinnable = true;

            // populate jsfiles
            build.builds[name].jsfiles = [
                'js/' + name + '.js'
            ];
            break;
        }

        // Stringify build.json and meta/{name}.json contents
        props.build_json = JSON.stringify(build, null, 4);
        props.meta_json = JSON.stringify(meta, null, 4);

        // filter out project-specific files when templating module only
        if (!props.hasOwnProperty('yui_release')) {
            Object.keys(renames).forEach(function (key) {
                if (key.indexOf('_project') > -1) {
                    renames[key] = false;
                }
            });
        }
    }


    function getProjectPrompts() {
        // Prompt for these values when creating a project
        return [
            // default 'name' => 'project_name'
            wrapDefault('name', 'project_name', {
                // don't create safe names.
                sanitize: null
            }),

            // default 'title' => 'project_title'
            wrapDefault('title', 'project_title', {
                // default from 'project_name' instead.
                'default': function (value, data, done) {
                    var title = data.project_name || '';
                    title = title.replace(/[\W_]+/g, ' ');
                    title = title.replace(/\w+/g, function (word) {
                        return word[0].toUpperCase() + word.slice(1).toLowerCase();
                    });
                    done(null, title);
                }
            }),

            // default 'description' => 'project_description'
            wrapDefault('description', 'project_description', {
                // disambiguates 'Description'
                message: 'Project description',
                // override default
                'default': 'The best YUI-based project ever.'
            }),

            // package.json
            init.prompt('version'),
            init.prompt('repository'),
            init.prompt('homepage'),
            init.prompt('bugs'),
            init.prompt('licenses', 'MIT'),
            init.prompt('author_name'),
            init.prompt('author_email'),
            init.prompt('author_url'),

            // project metadata
            {
                name: 'yui_release',
                message: 'Support YUI release tasks?',
                'default': 'Y/n',
                sanitize: function (value, data, done) {
                    done(null, (/y/i).test(value));
                }
            },
            {
                name: 'clean_build',
                message: 'Version build directory?',
                'default': 'Y/n',
                sanitize: function (value, data, done) {
                    // inverted default
                    done(null, !(/y/i).test(value));
                }
            },
            {
                name: 'copyright_owner',
                message: 'Copyright owner',
                'default': 'Yahoo! Inc.'
            },
            wrapDefault('version', 'yui_version', {
                message: 'YUI version',
                'default': '3.10.0'
            })
        ];
    }

    function addProjectProperties(props) {
        // Add additional properties for package.json
        props.peerDependencies = {
            'yui': props.yui_version
        };
        props.devDependencies = {
            'yui': props.yui_version,
            'yogi': '~0.1.9',
            'grunt-cli': '~0.1.8',
            'grunt-lib-contrib': '~0.6.1',
            'grunt-yui-contrib': '~0.0.12'
        };

        if (props.yui_release) {
            props.devDependencies['grunt-contrib-compress'] = '~0.5.0';
        }

        if (props.clean_build) {
            props.devDependencies['grunt-contrib-clean'] = '~0.4.1';
        }

        props.keywords = ['yui'];
        props.npm_test = 'grunt test';
        props.node_version = '>= 0.8.20';
    }

    function addProjectFiles(files, props) {
        if (props.licenses.length && props.licenses[0] !== 'none') {
            // Add properly-named license files.
            init.addLicenseFiles(files, props.licenses);
        }

        // filter out module-specific files when templating project only
        if (!props.hasOwnProperty('title')) {
            // iterate over files instead of init.renames
            // because init.filesToCopy() has already run
            Object.keys(files).forEach(function (outPath) {
                var srcPath = files[outPath];
                if (srcPath.indexOf('_project') === -1 &&
                    srcPath.indexOf('licenses') !== 0) {
                    delete files[outPath];
                }
            });
        }

        // Generate package.json file, used by npm and grunt.
        init.writePackageJSON('package.json', props, function (pkg, props) {
            // `project_*`
            ['name', 'title', 'description'].forEach(function (prop) {
                if (props['project_' + prop]) {
                    pkg[prop] = props['project_' + prop];
                }
            });

            // provide postinstall script
            pkg.scripts.postinstall = "grunt build";

            return pkg;
        });
    }


    var templatePrompts = [];
    if (needsProject) {
        templatePrompts.push(getProjectPrompts());
    }
    if (!projectOnly) {
        templatePrompts.push(getModulePrompts());
    }
    templatePrompts = grunt.util._.flatten(templatePrompts);


    // since grunt-init has already tried to find
    // the empty exports.notes, log it here
    grunt.log.subhead('"yui" template notes:').writelns(exports.notes);


    // Gets the ball rolling, finally.
    init.process(templatePrompts, function (err, props) {
        if (needsProject) {
            addProjectProperties(props);
        }

        if (!projectOnly) {
            addModuleProperties(props);
        }

        // Files to copy (and process).
        var files = init.filesToCopy(props);

        if (needsProject) {
            addProjectFiles(files, props);
        }

        // Actually copy (and process) files.
        init.copyAndProcess(files, props);

        // All done!
        done();
    });

};
