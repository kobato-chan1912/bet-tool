#!/bin/bash

for i in {1..100}; do
  echo "Lần thứ $i - $(date)" | tee -a ketqua.log

  response=$(curl -s 'https://api.adavawef.top/Promotion/GetInviteBonus' \
    -H 'accept: */*' \
    -H 'accept-language: vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1' \
    -H 'content-type: application/json' \
    -H 'origin: https://j88code.com' \
    -H 'priority: u=1, i' \
    -H 'referer: https://j88code.com/' \
    -H 'sec-fetch-dest: empty' \
    -H 'sec-fetch-mode: cors' \
    -H 'sec-fetch-site: cross-site' \
    -H 'user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' \
    --data-raw '{"InviteCode":"RaRbVL","Account":"kuden181996","BankCard":"2181","VerifyCode":"v1(e9e3eb7b,4a1fd536,MTPublic-rNhjhnaV7,6c64248ad42cd387090141efd95063f0,xO8h4CxqkdSYP9LWB1IXOrTFR3lUu_dgmFguWCKeGqXXXqIpj7chuuAX44AYtNygG96T2VowG9vqklD_XX5qMPqe9bjtEAw_H-TmeywR-HfIWy7Lg2dzsZXc50uo2cWJkrQ7xYWzZ5QeEfZrt6O9PF-NkfuzBtwnad3scuB0XKlENCHsXDCxAYa0BZOtTAgW5-dPYpp2BrIiOZ_oXUhJJYWI3yyOcuOisyfTDpfKv6eTin8IiQ6euohlGXnWiHe1bGsCI07vU8-T1MjJbeXTEUasGLEl66Z_sw8HA0Uns8DFIymeXtA2GKkKcOZGnSDjJhCtfLj3wWXrg_o5-9hjCkWwFEqTUeqo_t2TIt1hmvA1nNO8Yu5h3zCje_ciS_DDIsU3gsAkoE8tChk2iz9gywCrNIkCzAcQFSx5Dn5VRG8*)","Token":"1746523411196","DistinctId":"0196a4e8-1da8-73a6-a25c-780e3feda889"}')

  echo "Kết quả:"
  echo "$response" | tee -a ketqua.log
  echo "-------------------------------" | tee -a ketqua.log

  sleep 5
done


