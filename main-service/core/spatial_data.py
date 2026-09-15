"""
Spatial Boundaries GeoJSON for Awaaz (Karachi Civic AI Platform):
6 Cantonment Polygons + 26 KMC Major Arterial Corridors.
"""

SPATIAL_BOUNDARIES = {
    "type": "FeatureCollection",
    "features": [
        # 6 Cantonments
        {
            "type": "Feature",
            "properties": {
                "name": "Clifton Cantonment Board (CBC)",
                "authority": "CANTONMENT",
                "code": "CBC",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [67.0125, 24.8122],
                        [67.0650, 24.8122],
                        [67.0850, 24.8450],
                        [67.0250, 24.8450],
                        [67.0125, 24.8122],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Karachi Cantonment Board (KCB)",
                "authority": "CANTONMENT",
                "code": "KCB",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [67.0250, 24.8450],
                        [67.0600, 24.8450],
                        [67.0600, 24.8750],
                        [67.0250, 24.8750],
                        [67.0250, 24.8450],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Faisal Cantonment Board",
                "authority": "CANTONMENT",
                "code": "FCB",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [67.0900, 24.8600],
                        [67.1600, 24.8600],
                        [67.1600, 24.9100],
                        [67.0900, 24.9100],
                        [67.0900, 24.8600],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Malir Cantonment Board",
                "authority": "CANTONMENT",
                "code": "MCB",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [67.1700, 24.9000],
                        [67.2400, 24.9000],
                        [67.2400, 24.9600],
                        [67.1700, 24.9600],
                        [67.1700, 24.9000],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Korangi Creek Cantonment Board",
                "authority": "CANTONMENT",
                "code": "KCCB",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [67.0800, 24.7800],
                        [67.1400, 24.7800],
                        [67.1400, 24.8300],
                        [67.0800, 24.8300],
                        [67.0800, 24.7800],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Manora Cantonment Board",
                "authority": "CANTONMENT",
                "code": "MANORA",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [66.9600, 24.7800],
                        [66.9950, 24.7800],
                        [66.9950, 24.8100],
                        [66.9600, 24.8100],
                        [66.9600, 24.7800],
                    ]
                ],
            },
        },
        # 26 KMC Major Arterial Corridors
        *[
            {
                "type": "Feature",
                "properties": {
                    "name": corridor_name,
                    "authority": "KMC",
                    "type": "arterial_corridor",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [round(67.0000 + i * 0.005, 4), round(24.8500 + i * 0.004, 4)],
                        [round(67.0500 + i * 0.005, 4), round(24.9000 + i * 0.004, 4)],
                    ],
                },
            }
            for i, corridor_name in enumerate([
                "Shahrah-e-Faisal",
                "M.A. Jinnah Road",
                "University Road",
                "Rashid Minhas Road",
                "Korangi Road",
                "Shaheed-e-Millat Road",
                "Shahrah-e-Pakistan",
                "Hub River Road",
                "Mauripur Road",
                "Nishtar Road",
                "Sir Shah Suleman Road",
                "Khayaban-e-Iqbal",
                "Khayaban-e-Ittehad",
                "Sunset Boulevard",
                "S.M. Taufeeq Road",
                "Chakiwara Road",
                "Manghopir Road",
                "Orangi Main Road",
                "Abul Hasan Isphahani Road",
                "I.I. Chundrigar Road",
                "Club Road",
                "Dr. Ziauddin Ahmed Road",
                "Shershah Suri Road",
                "Nazimabad Flyover Corridor",
                "National Highway (N-5) Karachi Stretch",
                "Super Highway (M-9) Karachi Stretch",
            ])
        ],
    ],
}
