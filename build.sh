#!/bin/bash

PACKAGE_NAME='mvpapp'
SOURCE_LOCATION='./src'
TEMPLATE='./mvpapp.mako'
CONFIG='./mvpapp.xml'

if [ -d ./$PACKAGE_NAME ]; then
    rm -rf ./$PACKAGE_NAME;
fi;

if [ ! -d ./$PACKAGE_NAME ]; then
    mkdir -p ./$PACKAGE_NAME/config;
    mkdir -p ./$PACKAGE_NAME/static/css;
    mkdir -p ./$PACKAGE_NAME/static/js/lib;
    mkdir -p ./$PACKAGE_NAME/templates;
fi;

cp -a $SOURCE_LOCATION/js/lib/. ./$PACKAGE_NAME/static/js/lib
cp -a $SOURCE_LOCATION/css/. ./$PACKAGE_NAME/static/css/
cp $TEMPLATE ./$PACKAGE_NAME/templates
cp $CONFIG ./$PACKAGE_NAME/config

cat $SOURCE_LOCATION/js/modules/*js > $SOURCE_LOCATION/application_full.js && cat $SOURCE_LOCATION/app.js >> $SOURCE_LOCATION/application_full.js
uglifyjs $SOURCE_LOCATION/application_full.js --compress --mangle -o $SOURCE_LOCATION/application.js
rm $SOURCE_LOCATION/application_full.js
mv $SOURCE_LOCATION/application.js ./$PACKAGE_NAME/static/js

tar -czf ./$PACKAGE_NAME.tar.gz ./$PACKAGE_NAME