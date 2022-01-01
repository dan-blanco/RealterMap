from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views import View
import pandas as pd
import sqlalchemy
from sqlalchemy import text
import json
import hjson
from dotenv import load_dotenv
import os

class Index(View):
    def get(self, request):
        greeting = {}
        greeting['heading'] = "US Real Estate"
        greeting['pageview'] = "Maps"
        return render (request,'index.html',greeting)


# County data was found here https://eric.clst.org/tech/usgeojson/
class AjaxDataJSON(View):

    def mysql_connect_str(self):
        load_dotenv()

        database_username = 'realty'
        database_password = os.getenv('MYSQL_PASS')
        database_ip       = '52.203.185.42'
        database_name     = 'realty'

        return f"mysql+mysqlconnector://{database_username}:{database_password}@{database_ip}/{database_name}"

    def post(self, request):
        
        data ={"error": ""} # default values to return
        status = 400 # Error
        req_file = request.POST.get("file","")

        if(req_file == "dates"): # return the min and max dates available in the dataset
            database_engine = sqlalchemy.create_engine(self.mysql_connect_str())
            df = pd.read_sql_query("SELECT min(month_date_yyyymm) as mindate, \
                    max(month_date_yyyymm) as maxdate FROM app_realter_inventory_county", database_engine)
            status = 200
#            df = pd.read_csv("~/Admin/static/data/RDC_Inventory_Core_Metrics_State_History.csv")
#            country_data = df[["month_date_yyyymm"]]
#            country_data["month_date_yyyymm"] = pd.to_datetime(country_data['month_date_yyyymm'], format="%Y%m")
#            country_data = country_data.set_index(['month_date_yyyymm'])
            mi = df["mindate"][0]
            mx = df["maxdate"][0]

            return JsonResponse({"min":mi,"max":mx}, status=status, safe=False)

        if (req_file == "state"): # all states, not counties

            database_engine = sqlalchemy.create_engine(self.mysql_connect_str())

            ## SQL INJECTION MUST PREVENT HERE TOO
            sql = f"SELECT state,state_id, month_date_yyyymm, {request.POST.get('feature','')}\
                            FROM app_realter_inventory_state \
                            WHERE month_date_yyyymm like :d1"

#            ex = request.POST.getlist('exclude')
#            if ex is not None and ex != []:
#                for st in ex: # for each state to exclude
                    # DO NOT FORGET SQL INJECTION !!!! make sure string matches against a list
#                    sql += " AND state_code != " +st.lower()

            df = pd.read_sql_query(
                    text(sql).bindparams(d1=request.POST.get('date')+"%"), database_engine)
            #df = pd.read_csv("~/Admin/static/data/RDC_Inventory_Core_Metrics_State_History.csv")

            country_data = df.copy()

            status = 200
            if 'feature' in request.POST and request.POST.get('feature','') in df.columns:
                feature = request.POST.get('feature','')
                #country_data = country_data[["state", feature, "month_date_yyyymm"]]
                #country_data["month_date_yyyymm"] = pd.to_datetime(country_data['month_date_yyyymm'], format="%Y%m") 
                country_data = country_data.set_index(['month_date_yyyymm'])
                #country_data = country_data.loc[request.POST.get('date')]

                geodata = hjson.load(open('/home/ubuntu/Admin/static/data/leaflet-us-states-new.json'))


               
                ex = []
                #if not isinstance(ex, list):ex = []
                for st in request.POST.getlist('exclude[]'):
                    ex.append(st.lower())
        
                new_geodata = []

                i = []
                for state_geo in geodata['features']:
                    if state_geo['properties']['name'].lower() not in ex:
                        try:
#                            density = country_data.loc[country_data['state']]
                            state_geo['properties']['density'] = \
                            float(country_data.loc[country_data['state'] == state_geo['properties']['name'].lower()][feature][0])
                        except:
                            state_geo['properties']['density'] = 0
                        new_geodata.append(state_geo)
                        i.append(state_geo['properties']['density'])


                #def fun(p):
                    #c = country_data[country_data["state"] == (p['properties']['name']).lower() ]
                    #try:
                        #p['properties']['density'] = float(c[feature][0])
                    #except: p['properties']['density'] =0
                    #i.append(p['properties']['density'])

                #any(map(fun, geodata['features'])) # I think the any keyword closes the iterable...

                return JsonResponse({"geodata":{"type":"FeatureCollection", "features":new_geodata},"instances":i}, status=status, safe=False)

        elif (req_file == "county"):
            feature = request.POST.get('feature','')
            state = ""
            state_codes = {
                    'WA': '53', 'DE': '10', 'DC': '11', 'WI': '55', 'WV': '54', 'HI': '15',
                    'FL': '12', 'WY': '56', 'PR': '72', 'NJ': '34', 'NM': '35', 'TX': '48',
                    'LA': '22', 'NC': '37', 'ND': '38', 'NE': '31', 'TN': '47', 'NY': '36',
                    'PA': '42', 'AK': '02', 'NV': '32', 'NH': '33', 'VA': '51', 'CO': '08',
                    'CA': '06', 'AL': '01', 'AR': '05', 'VT': '50', 'IL': '17', 'GA': '13',
                    'IN': '18', 'IA': '19', 'MA': '25', 'AZ': '04', 'ID': '16', 'CT': '09',
                    'ME': '23', 'MD': '24', 'OK': '40', 'OH': '39', 'UT': '49', 'MO': '29',
                    'MN': '27', 'MI': '26', 'RI': '44', 'KS': '20', 'MT': '30', 'MS': '28',
                    'SC': '45', 'KY': '21', 'OR': '41', 'SD': '46'
                }
            try:state = state_codes[request.POST.get('state','')] # if state falue not exist, return error
            except: return JsonResponse(data, status=status, safe=False)

            status= 200

            geodata = json.load(open('/home/ubuntu/Admin/static/data/states/countyGEOJSON_state_{}.json'.format(state)))
            
            #county_data = pd.read_csv("/home/ubuntu/Admin/static/data/RDC_Inventory_Core_Metrics_County_History.csv")
            database_engine = sqlalchemy.create_engine(self.mysql_connect_str())
            county_data = pd.read_sql_query(
                    text(f"SELECT county_name, month_date_yyyymm, {request.POST.get('feature','')}\
                            FROM app_realter_inventory_county \
                            WHERE month_date_yyyymm like :d1 AND county_name like :d2 ")\
                            .bindparams(d1=request.POST.get('date')+"%", d2 = "%"+request.POST.get('state','').lower()), database_engine)
            
            #county_data["month_date_yyyymm"] = pd.to_datetime(county_data['month_date_yyyymm'], format="%Y%m")

            #county_data = county_data.set_index(['month_date_yyyymm'])

            #county_data = county_data.loc['2020-11']
            
            county_data["county_name"] = county_data["county_name"].apply(lambda x: x.split(",", 1)[0] )

#            def fun(p):
#                c = county_data[county_data["county_name"] == p['properties']['NAME'].lower()]
#                try:p['properties']['density'] = float(c[feature][0])
#                except: p['properties']['density'] =0
#            
#            any(map(fun, geodata['features'])) # I think the any keyword closes the iterable...
#            
            new_geodata = {'features':[]}
            for county in geodata['features']:
                try:
                    density = float(county_data.loc[ county_data["county_name"] == county['properties']['NAME'].lower() ][feature].iloc[0])
                except:
                    density = 0
                county['properties']['density'] = density
                new_geodata['features'].append(county)

            return JsonResponse(new_geodata, status=status, safe=False)
#            return JsonResponse(county_data["county_name"], status=status, safe=False)

        
        elif (req_file == "features_list"):

#         pd.read_csv("/home/ubuntu/Admin/static/data/RDC_Inventory_Core_Metrics_County_History.csv").columns
                
            database_engine = sqlalchemy.create_engine(self.mysql_connect_str())

            df = pd.read_sql_query("SELECT * FROM app_realter_inventory_state LIMIT 1", database_engine)

            cols = []
            for k in df.keys():
                if not isinstance(df[k][0], str) and k != "month_date_yyyymm":
                    cols.append(k)

            return JsonResponse({"features":
                        json.dumps(cols)
                    }
                    , status = 200, safe = False)

        elif (req_file == "chartData"):
            
            database_engine = sqlalchemy.create_engine(self.mysql_connect_str())

            df = pd.read_sql_query("SELECT AVG(`median_listing_price`) as avg_mean, `month_date_yyyymm`\
                    FROM `app_realter_inventory_state` GROUP BY `month_date_yyyymm` ORDER BY `month_date_yyyymm` ASC", database_engine)
            df = df.iloc[-36:]
            data = {
                    "series": [
                        { "name" : "Nation Avg", "data" : df['avg_mean'].apply(lambda x: round(x,2)).tolist() }
                    ],
                    "dates": df['month_date_yyyymm'].apply(lambda x: str(x)[:7]).tolist()
            }

            for state in request.POST.getlist("states[]"):
                df = pd.read_sql_query(text("SELECT AVG(`median_listing_price`) as avg_mean, `month_date_yyyymm`,\
                        `state` FROM `app_realter_inventory_state` WHERE state_id LIKE :d1 GROUP BY `month_date_yyyymm`\
                        ORDER BY `month_date_yyyymm` ASC").bindparams(d1='%'+state+'%'), database_engine)
                df = df.iloc[-36:]
                data['series'].append({"name":state, "data":df['avg_mean'].apply(lambda x: round(x,2)).tolist() })

   

            return JsonResponse(data, status = 200, safe=False)

        return JsonResponse(data, status=status, safe=False)
    #####################3
 

# Create your views here.
