@echo off
mkdir build
copy *.html build
copy manifest.json build
copy LICENSE build
xcopy lib build\lib /i
xcopy img build\img /i
cd build
7z a -tzip "yermah.zip" -r
move yermah.zip ../../
cd ..
rmdir /s /q build