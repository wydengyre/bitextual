#copyright Antoni Oliver (2010) (Universitat Oberta de Catalunya - aoliverg@uoc.edu)

#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.

#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.

#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.

#usage:
#donload and uncompress linguistic data of Apertium for the desired pair of languages
#if you're using english-spanish
#python createdictionary.py apertium-en-es.en-es.dix
#this will create two dictionaries:
#hunapertium-en-es.dic: english-spanish
#hunapertium-es-en.dic: spanish-english
#by default the dictionaries are in UTF-8
#if you need a different encoding provide it as a second argument, for example:
#python createdictionary.py apertium-en-es.en-es.dix iso-8859-1


import re
import sys
import codecs
if len(sys.argv)<2:
    print("You must provide arguments: first argument Apertium's dictionary file, second (optional) encoding for the new dictionaries (default utf-8). See the code for details")
    sys.exit()
fitxer=sys.argv[1]

if len(sys.argv)>2:
    codificacio=sys.argv[2]
else:
    codificacio="utf-8"
print("FILE:",fitxer)
camps=fitxer.split(".")
camps2=camps[1].split("-")
slang=camps2[0]
tlang=camps2[1]

hash1={}
hash2={}

print("SOURCE LANGUAGE:",slang)
print("TARGET LANGUAGE:",tlang)
file1="hunapertium-"+slang+"-"+tlang+".dic"
file2="hunapertium-"+tlang+"-"+slang+".dic"
print("DICTIONARIES TO BE CREATED:")
print(file1)
print(file2)
print("DICTIONARY ENCODING:",codificacio)
f1=codecs.open(file1,"w",encoding=codificacio)
f2=codecs.open(file2,"w",encoding=codificacio)
text=codecs.open(fitxer,"r",encoding="utf-8").read()
found=re.findall("<p>(.*)</p>",text)
for p in found:
    try:
        source=re.findall("<l>(.*)</l>",p)
        target=re.findall("<r>(.*)</r>",p)
        source=re.sub("<.+?>"," ",source[0])
        target=re.sub("<.+?>"," ",target[0])
        source=source.lstrip()
        source=source.rstrip()
        target=target.lstrip()
        target=target.rstrip()
        source=re.sub("\s+"," ",source)
        target=re.sub("\s+"," ",target)
        cadena1=target+" @ "+source+"\n"
        cadena2=source+" @ "+target+"\n"
        if not hash1.has_key(cadena1):
            f1.write(cadena1)
            hash1[cadena1]=1
        if not hash2.has_key(cadena2):
            f2.write(cadena2)
            hash2[cadena2]=1
    except:
        print("ERROR IN",p)


