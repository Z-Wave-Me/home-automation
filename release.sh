#!/bin/bash

LAST_TAG=`git describe --tags --match 'v*' --abbrev=0`

git pull || exit

if [ -n "$1" ]; then
	TAG="$1"
	if [ -z "`grep -E '^## [0-9.]* '"$TAG"'$' CHANGELOG.md`" ]; then
		echo "Please update CHANGELOG.md:"
		echo "##" `date +'%d.%m.%Y'` "$TAG"
		echo "New features:"
		echo "Improvements:"
		echo "Fixes:"
		../../utils/git-log-since-tag.sh $LAST_TAG | awk '{print "* " $0}'
		exit 1
	fi
	
	awk '/^## [0-9.]* v[0-9.]*$/ { first++ } { if (first == 1) {print }}' README.md
	read -p "Commit and release? (y/N) " ANSWER
	if [ "$ANSWER" != "y" ]; then
		exit 2
	fi
	
	echo "Releasing $TAG"
	
	git add CHANGELOG.md &&
	git commit -m "dist" && git tag "$TAG" &&
	git push && git push --tags &&
	git checkout master && git merge develop && git push && git checkout develop # merge with master
else
	echo "Last released version was $LAST_TAG"
fi
