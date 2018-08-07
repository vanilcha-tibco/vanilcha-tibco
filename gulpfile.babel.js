"use strict";

import gulp from "gulp";
import del from "del";
import sourcemaps from "gulp-sourcemaps";
import ts from "gulp-typescript";
import tslint from "gulp-tslint";
import zip from "gulp-zip";
import runSequence from "run-sequence";
import fs from "fs";
import path from "path";
import gulpif from 'gulp-if';
import uglify from 'gulp-uglify-es';
import gutil from "gulp-util";


function handleError(level, error) {
  if (error.message) {
    gutil.log(gutil.colors.magenta(error.message));
  }
  if (isFatal(level)) {
    process.exit(1);
  }
}

// Convenience handler for error-level errors.
function onError(error) {
  handleError.call(this, 'error', error);
}

gulp.task("clean", callback => {
  return del(["dist"], {
    force: true
  }, callback)
});

// TsLint checks
gulp.task("ts:lint", callback => {
  return gulp.src("src/app/AzureServiceBus/**/*.ts")
    .pipe(tslint({
      formatter: "verbose",
      configuration: "tslint.json"
    }))
    .pipe(tslint.report())
    .on('error', onError);
});

// Copy resources
gulp.task("copy-resources", function () {
  return gulp
    .src(["src/app/AzureServiceBus/**/*.{svg,jpg,png,ico,ttf,eot,json,ts,go,txt,md}",
      "tci-deployer.sh",
      "properties.sh"
    ])
    .pipe(gulp.dest("dist"));
});

// Compile TypeScript to JS
gulp.task('compile:ts', callback => {
  let tsProject = ts.createProject('./tsconfig.json');
  return gulp
    .src([
      "src/app/AzureServiceBus/**/*.ts"
    ])
    .pipe(sourcemaps.init())
    .pipe(tsProject(ts.reporter.fullReporter(true)))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

// Compile TypeScript to JS
gulp.task('compile:ts:prod', callback => {
  let tsProject = ts.createProject('./tsconfig.json');
  return gulp
    .src([
      "src/app/AzureServiceBus/**/*.ts"
    ])
    .pipe(sourcemaps.init())
    .pipe(tsProject(ts.reporter.fullReporter(true)))
    .pipe(gulpif("**/*.js", uglify({
      compress: {
        sequences: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        unused: true,
        if_return: true,
        join_vars: true,
        drop_console: false
      }
    })))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

gulp.task("zip:contrib", callback => {
  return gulp.src('dist/**/*')
    .pipe(zip('contribution.zip'))
    .pipe(gulp.dest('.'))

});

gulp.task("dev", callback => {
  return runSequence(
    "clean",
    "ts:lint",
    "compile:ts",
    "copy-resources"
  )
});

gulp.task("prod", callback => {
  return runSequence(
    "clean",
    "ts:lint",
    "compile:ts:prod",
    "copy-resources"
  )
});

gulp.task("default", ["dev"]);
