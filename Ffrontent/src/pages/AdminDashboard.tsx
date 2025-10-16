
        {/* Main Content Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full">
            <TabsList className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full h-auto min-h-0 p-0 bg-transparent">
              <TabsTrigger 
                value="farmers" 
                className="flex-1 min-w-[120px] text-center whitespace-nowrap h-10"
              >
                Registered Farmers
              </TabsTrigger>
              <TabsTrigger 
                value="deletion-requests" 
                className="flex-1 min-w-[120px] text-center whitespace-nowrap h-10"
              >
                Deletion Requests
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex-1 min-w-[120px] text-center whitespace-nowrap h-10"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex-1 min-w-[120px] text-center whitespace-nowrap h-10"
              >
                Reports
              </TabsTrigger>
              <TabsTrigger 
                value="map" 
                className="flex-1 min-w-[120px] text-center whitespace-nowrap h-10"
              >
                Location Map
              </TabsTrigger>
            </TabsList>
          </div>
