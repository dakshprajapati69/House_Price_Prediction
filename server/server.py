from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from server import util

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

util.load_saved_artifacts()


@app.get('/get_location_names')
def get_location_names():

    return {
        "locations": util.get_location()
    }


class HouseData(BaseModel):
    total_sqft: float
    location: str
    bhk: int
    bath: int


@app.post('/get_estimate_price')
def get_estimate_price(data: HouseData):

    estimated_price = util.get_estimate_price(
        data.location,
        data.total_sqft,
        data.bath,
        data.bhk
    )

    return {
        "estimated_price": estimated_price
    }